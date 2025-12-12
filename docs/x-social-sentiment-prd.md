# X (Twitter) Social Sentiment Integration PRD

## 1. Objective
- Ingest near-real-time signals from X (formerly Twitter) to quantify ticker-level social sentiment and surface it in Ultramagnus workflows (Smart Analyze, Smart Updates, dashboards).
- Provide defensible, transparent sentiment outputs (scores + top drivers) without exposing PII or violating X policies.

## 2. Scope (v1)
- Read-only integration via X API (v2/v3 depending on access) for public posts; no posting or DMs.
- Coverage: U.S. equities tickers in our supported universe (same as existing fundamentals/price coverage).
- Sentiment outputs: rolling short-term score (e.g., 1h/6h/24h) and trend delta; top bullish/bearish snippets; volume/velocity flags.
- Surfaces: Smart Analyze report card, Smart Updates volatility/delta logic, and dashboard widgets.
- Exclusions: influencer ranking, bot detection beyond simple heuristics, options sentiment, non-English posts (v1).

## 3. User Value
- Faster signal detection around catalysts (earnings, M&A rumors, product launches).
- Confidence boost via “crowd mood” context alongside fundamentals and price action.
- Clear reasons: shows exemplar posts that moved the score, not a black-box number.

## 4. Key Use Cases
- **Earnings pre/post:** User checks `NVDA` hours before/after earnings; sees bullishness spike with sample posts.
- **Rumor control:** Sudden price move triggers Smart Updates; sentiment trend confirms whether social chatter supports the move.
- **Watchlist monitoring:** Dashboard highlights tickers with abnormal X volume/velocity to prompt deeper analysis.

## 5. Functional Requirements
- **Data Ingestion**
  - Query recent posts per ticker via filtered streams or search endpoints (must support ticker cashtags, e.g., `$AAPL`).
  - Deduplicate by post ID; store minimal fields: id, text, author handle (hashed), timestamps, engagement counts, language, links/hashtags, referenced tickers.
  - Respect rate limits; backoff and log failures; retry queue for transient errors.
- **Processing & Scoring**
  - Language filter: `lang == en` (v1); discard retweets/reposts; basic spam filters (emoji-only, link-only, low-followers heuristic).
  - Sentiment model: fast classifier (e.g., financial-tuned mini-LLM or rules) producing polarity (-1..1) and confidence.
  - Aggregate per ticker into rolling windows (1h/6h/24h): average polarity (confidence-weighted), volume (posts/hour), velocity change vs. prior window, bullish:bearish ratio.
  - Output `socialSentimentScore` mapped to 0-100 with banding: Bearish (<40), Neutral (40-60), Bullish (>60); include `delta` vs. prior window.
- **Surfacing**
  - Smart Analyze: add “Social Sentiment” card with score, trend arrow, and 3 exemplar posts (handles masked, links removed).
  - Smart Updates: use sentiment delta as a signal in volatility/delta logic (e.g., rising bearishness amplifies “Falling Knife”).
  - Dashboard: “Social Heat” widget showing top movers by velocity and sentiment shift.
- **Controls & Compliance**
  - Feature flag per environment; kill-switch to halt ingestion.
  - Redaction: mask handles (`@user123` -> `@****123`), remove URLs; store raw text but suppress in UI if policy requires.
  - Data retention policy aligned with X terms; purge after configured window (e.g., 30 days) if required.
  - Observability: logs for API errors, rate-limit events, ingestion volume, scoring latency.

## 6. Non-Functional Requirements
- Latency: ingestion + scoring within 2 minutes of post time for high-velocity tickers.
- Reliability: graceful degradation to “Sentiment unavailable” state; no hard dependency blocking reports.
- Cost: cap API usage; prefer streaming for popular tickers, batch search for long tail.
- Security: API keys stored in secure secrets manager; service-to-service auth; principle of least privilege.

## 7. Data Model (proposed)
- `social_posts`: `id`, `ticker`, `text`, `author_hash`, `created_at`, `lang`, `engagement_counts`, `hashtags`, `urls_count`, `source`
- `social_sentiment_snapshots`: `ticker`, `window` (1h/6h/24h), `score_0_100`, `delta`, `avg_polarity`, `bullish_ratio`, `volume_per_hour`, `velocity_change`, `top_post_ids`
- `social_ingestion_runs`: `run_id`, `status`, `api_calls`, `rate_limit_hits`, `error_counts`, `duration_ms`

## 8. Success Metrics
- Coverage: % of supported tickers with sentiment snapshots in last 6h.
- Freshness: median age of latest snapshot (<5 min for top 50 tickers).
- Correlation: sentiment delta vs. price move direction around events (qualitative tracking initially).
- UX engagement: CTR on “Social Sentiment” card; user saves after seeing sentiment; alert clicks.

## 9. Risks & Mitigations
- **API access/rate limits:** secure elevated access; cache results; prioritize top tickers; fallback to lower-frequency polling.
- **Noise/Bots:** apply heuristics (follower threshold, repetition filters); consider simple bot lists; keep model confidence weighting.
- **Compliance/PII:** mask handles and URLs; document data retention; enforce TOS-aligned usage.
- **Model drift/bias:** periodic eval set; allow manual overrides/blacklist; log distributions.
- **Low-signal tickers:** show “insufficient data” state; backfill with longer windows.

## 10. Open Questions
- Access level: do we have X enterprise/academic access for filtered stream? If not, what tier can we buy?
- Allowed text storage duration under our agreement?
- Need multilingual in short term (e.g., ES/JP) for select tickers?
- Where to display sentiment in mobile layout; do we need compact widget?

## 11. Delivery Plan (v1)
- Week 1: confirm API access tier; scaffold ingestion service; set up secrets, feature flags, logging.
- Week 2: implement ticker-based filters/search; store posts; basic spam filters; initial sentiment model + scoring.
 - Week 3: build snapshots aggregation; expose service API (`GET /api/social-sentiment?ticker=...`); add UI cards in Smart Analyze/Dashboard behind flag; scaffold a demo page to visualize sentiment score/delta, volume/velocity, and exemplar posts.
- Week 4: QA (rate-limit handling, low-signal paths, UI states), perf tuning, documentation; go-live with staged rollout.
