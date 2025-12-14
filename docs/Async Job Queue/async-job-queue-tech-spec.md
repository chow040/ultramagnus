# Async Job Queue for Mobile Analysis Tech Spec

## Problem Statement

When users run stock analysis on mobile devices (particularly iPhone) and lock their screen or switch apps, the browser suspends JavaScript execution and terminates active WebSocket/SSE connections. This causes:
- Loss of in-progress analysis results
- Wasted API credits and compute resources
- Poor mobile user experience

## Scope & Objectives

- **Objective:** Decouple analysis request submission from result delivery to survive browser suspension
- **Key Features:**
  - Job-based analysis: Submit request → get job ID → poll for results
  - Background processing: Backend continues analysis even if client disconnects
  - Persistent job storage: Results retrievable after app reopen
  - Mobile-optimized polling: Resume checking status when app returns to foreground
- **User Value:** Users can lock phones, switch apps, or close browser during analysis. Results are saved and retrievable when they return.

## Architecture

### Backend (Node.js/Express on Alibaba Cloud ECS)

- **New Service:** `JobQueueService` (`src/services/jobQueueService.ts`)
  - Manages job lifecycle: creation, status updates, completion
  - Uses `pg-boss` (PostgreSQL-based queue) for job management
  - Handles concurrency, retries, and failure scenarios

- **New Worker Process:** `src/workers/analysisWorker.ts`
  - Separate Node.js process managed by PM2
  - Polls for pending jobs from pg-boss queue
  - Executes analysis generation (reuses existing AI analysis logic)
  - Updates job status and stores results in database

- **New Routes:** `src/routes/jobs.ts`
  - `POST /api/jobs/analyze` - Create analysis job
  - `GET /api/jobs/:jobId` - Get job status and results
  - `GET /api/jobs` - List user's jobs (history)
  - `DELETE /api/jobs/:jobId` - Cancel pending job
- **Report Listing Search (supporting FE library search)**
  - `GET /api/reports` now accepts `q` (ticker or title, case-insensitive) for server-side filtering and pagination.
  - Dashboard aggregate route `/api/dashboard` forwards `q` to reports listing for consistent search results.

### Frontend (React/Vite on Vercel)

- **New Hook:** `useJobPolling.ts`
  - Polls job status endpoint at 2-3 second intervals
  - Pauses polling when app is backgrounded (Page Visibility API)
  - Resumes polling when app returns to foreground
  - Auto-stops when job completes or fails

- **Updated Components:**
  - Modify existing analysis trigger to submit job instead of streaming
  - Show job status UI: "Queued" → "Processing" → "Completed"
  - Display progress indicator during polling
  - Link to results page when job completes

- **State Management:**
  - Store active job IDs in localStorage
  - Resume polling for incomplete jobs on app mount
  - Clear completed jobs after results are viewed

## Data Model & Schema

### Database (PostgreSQL/Drizzle on Supabase)

#### New Table: `analysis_jobs`

```typescript
export const analysisJobs = pgTable('analysis_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  ticker: text('ticker').notNull(),
  analysisType: text('analysis_type').notNull().default('gemini'), // gemini | langgraph
  status: text('status').notNull().default('pending'), // pending | processing | completed | failed
  priority: integer('priority').notNull().default(0), // Higher = more urgent
  reportId: uuid('report_id'), // Links to reports table when completed
  error: text('error'), // Error message if failed
  metadata: jsonb('metadata'), // Job parameters, retry count, analysisType-specific config
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true })
});
```

**Indexes:**
- `idx_analysis_jobs_user_status` on `(user_id, status)`
- `idx_analysis_jobs_ticker_created` on `(ticker, created_at DESC)`
- `idx_analysis_jobs_status_created` on `(status, created_at ASC)` (for worker polling)

#### pg-boss Tables (Auto-created)

pg-boss will automatically create its own tables in the `pgboss` schema:
- `pgboss.job` - Queue state
- `pgboss.archive` - Completed jobs (auto-cleanup after 7 days)
- `pgboss.version` - Schema version
- `pgboss.schedule` - Scheduled jobs

**Storage Impact:** < 1 MB for thousands of jobs

### Modified Table: `reports`

No schema changes needed. Reports continue to be stored normally. The `analysis_jobs.report_id` foreign key links jobs to their generated reports.

## Logic & Algorithms

### Job Lifecycle State Machine

```
┌─────────┐  Worker picks up  ┌────────────┐  Analysis succeeds  ┌───────────┐
│ pending │ ───────────────> │ processing │ ─────────────────> │ completed │
└─────────┘                   └────────────┘                     └───────────┘
     │                              │                                   ▲
     │                              │ Analysis fails                    │
     │ Timeout/Cancel               │ (retry if transient)              │
     ▼                              ▼                                   │
┌──────────┐                  ┌─────────┐  Max retries reached         │
│ canceled │                  │ retrying│ ──────────────────────────────┘
└──────────┘                  └─────────┘
                                    │
                                    │ Permanent failure
                                    ▼
                              ┌─────────┐
                              │ failed  │
                              └─────────┘
```

### Job Creation Flow (`POST /api/jobs/analyze`)

1. **Validate:** Check ticker format, user auth
2. **Deduplication:** Check for pending/processing job for same user+ticker created within last 5 minutes
   - If exists, return existing job ID (prevent duplicate requests)
3. **Create Job Record:** Insert into `analysis_jobs` with status `pending`
4. **Enqueue:** Submit to pg-boss queue
5. **Return:** `{ jobId, status: 'pending', estimatedDuration: '30-60s' }`

### Worker Processing Flow

1. **Poll Queue:** pg-boss `work()` method blocks until job available
2. **Update Status:** Set job to `processing`, record `startedAt`
3. **Execute Analysis:**
   - **Route based on `analysisType`:**
     - `gemini`: Use existing `/api/ai/stream-report` logic (Gemini with Google Search)
     - `langgraph`: Use existing `/api/ai/stream-report/langgraph` logic (LangGraph analyst workflow)
   - Collect full response in memory (buffer streamed chunks)
   - Parse and validate JSON result
4. **Handle Result:**
   - **Success:** 
     - Create report in `reports` table
     - Update job: `status = 'completed'`, `report_id = <new report>`, `completed_at = now()`
     - pg-boss: `done()` to acknowledge job
   - **Failure (Transient):** 
     - API timeout, rate limit, network error
     - pg-boss: `fail()` with retry (max 3 attempts, exponential backoff)
   - **Failure (Permanent):**
     - Invalid ticker, API key exhausted, parsing error
     - Update job: `status = 'failed'`, `error = <message>`
     - pg-boss: `fail()` without retry
5. **Cleanup:** pg-boss archives completed jobs after 7 days

### Frontend Polling Strategy

```typescript
// Simplified polling logic
const useJobPolling = (jobId: string) => {
  const [status, setStatus] = useState('pending');
  const [report, setReport] = useState(null);
  
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const poll = async () => {
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();
      
      setStatus(data.status);
      
      if (data.status === 'completed') {
        setReport(data.report);
        clearInterval(intervalId);
      } else if (data.status === 'failed') {
        clearInterval(intervalId);
      }
    };
    
    // Poll every 2 seconds
    intervalId = setInterval(poll, 2000);
    poll(); // Initial poll
    
    // Pause polling when page is hidden (mobile background)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(intervalId);
      } else {
        intervalId = setInterval(poll, 2000);
        poll();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [jobId]);
  
  return { status, report };
};
```

**Optimizations:**
- Exponential backoff: Start at 1s, increase to 2s → 5s → 10s for long-running jobs
- Cancel polling after 5 minutes (assume failure, user can manually refresh)
- Cache completed jobs in localStorage to avoid re-polling on page reload

## API Design

### `POST /api/jobs/analyze`

**Request:**
```json
{
  "ticker": "NVDA",
  "analysisType": "langgraph" // Optional: "gemini" (default) or "langgraph"
}
```

**Frontend Behavior:**
- Frontend reads `VITE_LANGGRAPH_ANALYST_ENABLED` environment variable
- If `true`, sends `analysisType: "langgraph"`
- If `false` or unset, sends `analysisType: "gemini"` (or omits field, defaults to gemini)
- This allows seamless switching between analysis engines via environment config

**Response (201 Created):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "ticker": "NVDA",
  "analysisType": "langgraph",
  "estimatedDuration": "30-60 seconds",
  "createdAt": "2025-12-13T10:30:00Z"
}
```

**Error Cases:**
- `400 Bad Request`: Missing/invalid ticker, invalid analysisType
- `409 Conflict`: Job already in progress for this ticker (returns existing job)
- `429 Too Many Requests`: Rate limit exceeded (max 5 pending jobs per user)

### `GET /api/jobs/:jobId`

**Response (200 OK) - Pending:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "ticker": "NVDA",
  "analysisType": "langgraph",
  "createdAt": "2025-12-13T10:30:00Z",
  "estimatedWaitTime": "15 seconds"
}
```

**Response (200 OK) - Processing:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "ticker": "NVDA",
  "analysisType": "langgraph",
  "createdAt": "2025-12-13T10:30:00Z",
  "startedAt": "2025-12-13T10:30:05Z",
  "progress": 45 // Optional: percentage complete
}
```

**Response (200 OK) - Completed:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "ticker": "NVDA",
  "analysisType": "langgraph",
  "reportId": "660e8400-e29b-41d4-a716-446655440001",
  "report": { /* Full report object */ },
  "createdAt": "2025-12-13T10:30:00Z",
  "completedAt": "2025-12-13T10:30:45Z",
  "duration": 45000 // milliseconds
}
```

**Response (200 OK) - Failed:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "ticker": "NVDA",
  "error": "Invalid ticker symbol",
  "createdAt": "2025-12-13T10:30:00Z",
  "failedAt": "2025-12-13T10:30:05Z"
}
```

**Error Cases:**
- `404 Not Found`: Job ID doesn't exist or belongs to different user

### `GET /api/jobs`

List user's recent jobs (for history/resume)

**Query Parameters:**
- `status` (optional): Filter by status (pending|processing|completed|failed)
- `limit` (default: 20, max: 100)
- `cursor` (optional): Pagination cursor

**Response (200 OK):**
```json
{
  "jobs": [
    {
      "jobId": "550e8400-e29b-41d4-a716-446655440000",
      "ticker": "NVDA",
      "status": "completed",
      "reportId": "660e8400-e29b-41d4-a716-446655440001",
      "createdAt": "2025-12-13T10:30:00Z",
      "completedAt": "2025-12-13T10:30:45Z"
    },
    // ... more jobs
  ],
  "nextCursor": "base64encodedcursor",
  "hasMore": true
}
```

### `DELETE /api/jobs/:jobId`

Cancel a pending or processing job

**Response (200 OK):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "canceled"
}
```

**Error Cases:**
- `404 Not Found`: Job doesn't exist
- `409 Conflict`: Job already completed/failed (can't cancel)

## Implementation Plan

### Phase 1: Backend Foundation (Job Queue Infrastructure)

**Backend Tasks:**
- [x] Install pg-boss: `npm install pg-boss`
- [x] Create database migration for `analysis_jobs` table (includes `analysis_type` gemini|langgraph)
  - [x] Define schema in `src/db/schema.ts`
  - [x] Generate migration with `npm run db:generate`
  - [x] Apply migration with `npm run db:migrate`
  - [x] Add indexes for performance
- [x] Create `JobQueueService` class (`src/services/jobQueueService.ts`)
  - [x] Initialize pg-boss with Supabase connection
  - [x] Implement `createJob(userId, ticker, analysisType)` method with dedupe & pending limit
  - [x] Implement `getJob(jobId)` method
  - [x] Implement `listJobs(userId, filters)` method
  - [x] Implement `cancelJob(jobId)` method
- [x] Create jobs API routes (`src/routes/jobs.ts`)
  - [x] Wire `POST /api/jobs/analyze` endpoint (validates ticker & analysisType)
  - [x] Wire `GET /api/jobs/:jobId` endpoint
  - [x] Wire `GET /api/jobs` endpoint
  - [x] Wire `DELETE /api/jobs/:jobId` endpoint
  - [x] Add auth middleware to all routes
  - [x] Add request validation middleware
  - [ ] Add rate limiting (max 5 pending jobs per user)
- [x] Add pg-boss initialization to `src/app.ts`
  - [x] Initialize boss instance on app startup
  - [x] Add graceful shutdown handler
- [ ] Test with Postman/curl
  - [ ] Test job creation
  - [ ] Test job status retrieval
  - [ ] Test job listing
  - [ ] Test error cases (invalid ticker, unauthorized)

**Frontend Tasks:**
- None (backend-first approach)

### Phase 2: Worker Implementation (Background Processing)

**Backend Tasks:**
- [x] Create analysis worker (`src/workers/analysisWorker.ts`)
  - [x] Set up pg-boss worker process
  - [x] Extract Gemini analysis logic from `/api/ai/stream-report` (non-stream buffer)
  - [x] Extract LangGraph analysis logic from `/api/ai/stream-report/langgraph`
  - [x] Implement job processing function with `analysisType` routing
  - [ ] Add error handling and retry logic (boss retry tuning pending)
  - [x] Add structured logging for job lifecycle
  - [ ] Handle timeout scenarios
  - [ ] Buffer streamed responses for both analysis types
- [x] Create worker entry point (`src/workers/index.ts`)
  - [x] Initialize pg-boss worker
  - [x] Register job handlers
  - [x] Add graceful shutdown
- [x] Add PM2 configuration for worker process
  - [x] Create/update PM2 ecosystem file
  - [x] Configure restart policy
  - [x] Set memory limits (max 1GB)
  - [x] Configure log rotation
- [x] Update deployment guide with worker setup
  - [x] Add worker start command
  - [x] Add monitoring instructions
- [ ] Test job processing end-to-end
  - [x] Test successful job completion (Gemini path OK; LangGraph currently timing out/no report, per-step timeout 3m)
  - [ ] Test retry on transient failure
  - [ ] Test permanent failure handling
  - [ ] Test concurrent job processing

**Frontend Tasks:**
- None

### Phase 3: Frontend Integration (UI + Polling)

**Frontend Tasks:**
- [x] Create `useJobPolling` hook (`src/hooks/useJobPolling.ts`)
  - [x] Implement basic polling logic (2-3 second intervals with backoff)
  - [x] Add Page Visibility API support (pause when backgrounded)
  - [x] Add exponential backoff for long-running jobs
  - [x] Add localStorage persistence for active jobs
  - [x] Add cleanup logic for completed jobs
- [x] Create job status components
  - [x] `JobStatusBadge.tsx` - Visual status indicator (pending/processing/completed/failed)
  - [x] `JobProgressCard.tsx` - Full job progress UI with estimated time
  - [x] `JobHistoryList.tsx` - List of recent jobs with filters
- [x] Update analysis trigger flow
  - [x] Replace streaming API call with job creation (App.tsx uses /api/jobs/analyze + poll)
  - [x] Read `VITE_LANGGRAPH_ANALYST_ENABLED` to determine `analysisType`
  - [x] Pass `analysisType` parameter to job creation API
  - [x] Show job status UI instead of streaming UI
  - [ ] Add "View in background" functionality
  - [x] Navigate to results when job completes (session result + library update)
- [x] Add job resumption on app mount
  - [x] Check localStorage for pending/processing jobs
  - [x] Resume polling for incomplete jobs
  - [ ] Display resume banner for background jobs
  - [x] Clean up completed jobs from localStorage
- [ ] Update error handling
  - [ ] Show user-friendly error messages for failed jobs
  - [ ] Add retry button for failed jobs
  - [ ] Add cancel button for pending jobs
  - [ ] Handle network errors gracefully

**Backend Tasks:**
- None

### Phase 4: Testing & Optimization

**Backend Tasks:**
- [ ] Load testing
  - [ ] Simulate 10+ concurrent jobs
  - [ ] Test queue performance under load
  - [ ] Verify no job loss or duplication
- [ ] Monitor pg-boss performance metrics
  - [ ] Track queue depth over time
  - [ ] Monitor job processing latency
  - [ ] Check archive cleanup is working
- [ ] Optimize worker concurrency settings
  - [ ] Determine optimal worker count
  - [ ] Configure job batch size
  - [ ] Tune retry parameters
- [ ] Add alerting for stuck jobs
  - [ ] Detect jobs stuck > 5 minutes
  - [ ] Alert on high failure rate
  - [ ] Monitor worker health
- [ ] Configure pg-boss archive cleanup
  - [ ] Set retention period (7 days)
  - [ ] Verify old jobs are purged
  - [ ] Monitor storage usage

**Frontend Tasks:**
- [ ] Mobile testing on iPhone Safari
  - [ ] Lock screen during job processing → verify results retrievable
  - [ ] Switch apps during job processing → verify polling resumes
  - [ ] Close tab and reopen → verify job resumption from localStorage
  - [ ] Test in low power mode
  - [ ] Test with both Gemini and LangGraph analysis types
- [ ] Network resilience testing
  - [ ] Simulate poor connection (slow 3G)
  - [ ] Test polling recovery after network failure
  - [ ] Verify no duplicate job creation on retry
- [ ] Performance optimization
  - [ ] Reduce polling frequency for long jobs (exponential backoff)
  - [ ] Implement request deduplication
  - [ ] Minimize re-renders during polling
  - [ ] Optimize localStorage usage

**Deployment Tasks:**
- [ ] Create database migration
  - [ ] Review migration SQL
  - [ ] Test migration on staging database
  - [ ] Prepare rollback plan
- [ ] Deploy backend with worker process
  - [ ] Deploy code to ECS
  - [ ] Run database migration
  - [ ] Start worker process with PM2
  - [ ] Verify both API and worker are running
- [ ] Monitor job success rates
  - [ ] Watch logs for errors
  - [ ] Track job completion rate
  - [ ] Monitor API response times
- [ ] Deploy frontend changes
  - [ ] Deploy to Vercel
  - [ ] Verify API integration works
  - [ ] Test on production with real jobs
- [ ] Update user documentation
  - [ ] Add job queue explanation to help docs
  - [ ] Update FAQ with mobile usage tips
  - [ ] Add troubleshooting guide

## Deployment Considerations

### PM2 Configuration

Add worker process to PM2 ecosystem:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'moonshot-be',
      script: 'dist/src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'analysis-worker',
      script: 'dist/src/workers/index.js',
      instances: 1, // Start with 1, scale up based on load
      exec_mode: 'fork',
      max_memory_restart: '1G',
      env: { NODE_ENV: 'production' }
    }
  ]
};
```

**Worker Scaling:**
- Start with 1 worker instance
- Monitor queue depth and job latency
- Scale to 2-3 workers if average wait time > 30 seconds
- Each worker uses ~200-500 MB memory

### Database Considerations

**pg-boss Configuration:**
```typescript
const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  schema: 'pgboss', // Separate schema for queue tables
  archiveCompletedAfterSeconds: 7 * 24 * 60 * 60, // 7 days
  retryLimit: 3,
  retryDelay: 60, // 1 minute
  retryBackoff: true,
  expireInSeconds: 5 * 60 // 5 minutes
});
```

**Supabase Free Tier Impact:**
- pg-boss uses 1-2 database connections
- Queue tables use < 1 MB storage
- No impact on 500 MB limit
- Completed jobs auto-archived after 7 days

### Monitoring & Alerts

**Key Metrics to Track:**
- Average job duration
- Job success/failure rates
- Queue depth (pending jobs)
- Worker CPU/memory usage
- Failed job reasons

**Alert Thresholds:**
- Queue depth > 10 jobs (scale workers)
- Job failure rate > 10% (investigate errors)
- Average duration > 2 minutes (API issues)
- Worker memory > 800 MB (restart needed)

## Alternative Approaches Considered

### Option A: Simple Polling (No pg-boss)

**Pros:**
- Zero dependencies
- Simpler implementation
- Full control over queue logic

**Cons:**
- Need to implement concurrency locks manually
- No built-in retry mechanism
- Risk of race conditions with multiple workers
- More code to maintain

**Verdict:** Not recommended. pg-boss is mature and battle-tested.

### Option B: Redis-based Queue (Bull/BullMQ)

**Pros:**
- Industry standard
- Rich features (priorities, rate limiting, scheduling)
- Better performance at high scale

**Cons:**
- **Requires Redis instance** (additional infrastructure cost)
- Not available on Supabase free tier
- Overkill for current scale (< 1000 jobs/day)

**Verdict:** Not worth the complexity for current needs.

### Option C: Serverless Queue (AWS SQS/Azure Queue)

**Pros:**
- Fully managed
- Auto-scaling
- No server maintenance

**Cons:**
- Vendor lock-in
- Additional cost
- Cross-cloud complexity (worker on Alibaba, queue on AWS)
- Network latency

**Verdict:** Poor fit for current architecture.

## API Specs (current)

- `POST /api/jobs/analyze` → create job `{ jobId, status, ticker, analysisType, deduped? }`
- `GET /api/jobs/:jobId` → job detail `{ id, status, ticker, analysisType, reportId?, error? }`
- `GET /api/jobs` → list with optional `status`, `limit` → `{ jobs, hasMore }`
- `DELETE /api/jobs/:jobId` → cancel if pending
- `GET /api/reports` supports `page`, `pageSize`, `q` (ticker/title search, case-insensitive) for library search
- `GET /api/dashboard` accepts `q` and forwards to reports search to keep dashboard list/search in sync

## Success Metrics

**Technical:**
- 95%+ job completion rate
- < 60 second average job duration
- < 5 second polling latency
- Zero jobs stuck > 5 minutes

**User Experience:**
- Users can lock phone during analysis (100% of cases)
- Results retrievable after app reopen (100% of cases)
- < 3 clicks to resume checking job status
- Clear status updates every 2 seconds

**Cost:**
- No increase in failed API calls
- < 10% increase in database queries (polling overhead)
- No additional infrastructure cost

## Future Enhancements (Post-MVP)

1. **Push Notifications:** Notify users when job completes (requires PWA)
2. **Job Prioritization:** Premium users get faster processing
3. **Batch Jobs:** Submit multiple tickers at once
4. **Scheduled Jobs:** Daily analysis for watchlist tickers
5. **Job Cancellation UI:** Cancel button in frontend
6. **Progress Indicators:** Real-time progress percentage (complex)
7. **Job Analytics:** Dashboard showing job statistics
8. **Webhook Callbacks:** Notify external services when job completes

---

**Document Status:** Draft  
**Author:** AI Assistant  
**Date:** 2025-12-13  
**Dependencies:** AGENT.md, streaming-tech-spec.md  
**Related PRDs:** N/A (new feature)
