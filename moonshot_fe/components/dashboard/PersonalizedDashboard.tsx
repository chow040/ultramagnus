import React from 'react';
import { Bookmark, DashboardError, DashboardView } from '../../types';
import { RefreshCw, AlertTriangle, BookOpen, Clock, Star, Plus, ExternalLink } from 'lucide-react';

interface PersonalizedDashboardProps {
  data?: DashboardView | null;
  errors?: DashboardError[];
  isLoading: boolean;
  onRefresh: () => void;
}

const SectionCard: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => (
  <div className="bg-surface border border-border rounded-sm p-4 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-bold text-primary">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const SectionError: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-100 border border-amber-200 rounded-sm px-3 py-2">
    <AlertTriangle className="w-4 h-4" />
    <span>{message}</span>
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-xs text-secondary italic">{message}</div>
);

const formatDate = (value: string) => new Date(value).toLocaleDateString();

const BookmarkItem: React.FC<{ item: Bookmark }> = ({ item }) => (
  <div className="flex items-center justify-between text-xs text-primary">
    <div className="flex items-center gap-2">
      <Star className={`w-3.5 h-3.5 ${item.pinned ? 'text-amber-600' : 'text-secondary'}`} />
      <div className="flex flex-col">
        <span className="font-semibold">{item.targetId}</span>
        <span className="text-[10px] text-secondary">Updated {item.updatedAt ? formatDate(item.updatedAt) : formatDate(item.createdAt)}</span>
      </div>
    </div>
    <ExternalLink className="w-3.5 h-3.5 text-secondary" />
  </div>
);

const PersonalizedDashboard: React.FC<PersonalizedDashboardProps> = ({ data, errors = [], isLoading, onRefresh }) => {
  const sectionError = (section: DashboardError['section']) => errors.find(e => e.section === section);

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary">Your Dashboard</h2>
          <p className="text-xs text-secondary">Reports, bookmarks, and recent activity are scoped to your account.</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 text-xs font-semibold text-primary bg-surface hover:bg-tertiary/10 px-3 py-2 rounded-sm border border-border transition"
          disabled={isLoading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : 'text-secondary'}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard
          title="My Reports"
          action={<span className="text-[11px] text-secondary">Total {data?.reports.length ?? 0}</span>}
        >
          {sectionError('reports') && <SectionError message={sectionError('reports')!.message} />}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-tertiary/10 rounded-sm animate-pulse" />
              ))}
            </div>
          ) : (data?.reports.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {data?.reports.map(report => (
                <div key={report.id} className="flex items-center justify-between text-xs text-primary">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    <div className="flex flex-col">
                      <span className="font-semibold">{report.title}</span>
                      <span className="text-[10px] text-secondary">{report.status.toUpperCase()} · Updated {formatDate(report.updatedAt)}</span>
                    </div>
                  </div>
                  <ArrowBadge status={report.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No reports yet. Run your first analysis to see it here." />
          )}
        </SectionCard>

        <SectionCard
          title="Recent Activity"
          action={<span className="text-[11px] text-secondary">{data?.recentActivity.length ?? 0} events</span>}
        >
          {sectionError('activity') && <SectionError message={sectionError('activity')!.message} />}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-tertiary/10 rounded-sm animate-pulse" />
              ))}
            </div>
          ) : (data?.recentActivity.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {data?.recentActivity.map(event => (
                <div key={event.id} className="flex items-center justify-between text-xs text-primary">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <div className="flex flex-col">
                      <span className="font-semibold capitalize">{event.verb} · {event.targetId}</span>
                      <span className="text-[10px] text-secondary">{new Date(event.occurredAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No recent activity. Actions you take will appear here." />
          )}
        </SectionCard>

        <SectionCard
          title="Bookmarks"
          action={<span className="text-[11px] text-secondary">{data?.bookmarks.length ?? 0} saved</span>}
        >
          {sectionError('bookmarks') && <SectionError message={sectionError('bookmarks')!.message} />}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-tertiary/10 rounded-sm animate-pulse" />
              ))}
            </div>
          ) : (data?.bookmarks.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {data?.bookmarks.map(bookmark => (
                <BookmarkItem key={bookmark.id} item={bookmark} />
              ))}
            </div>
          ) : (
            <EmptyState message="No bookmarks yet. Save a report to pin it here." />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Quick Actions"
        action={null}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'New report', icon: <Plus className="w-4 h-4" /> },
            { label: 'Upload data', icon: <DatabaseIcon /> },
            { label: 'Import template', icon: <Star className="w-4 h-4" /> }
          ].map(action => (
            <button
              key={action.label}
              className="flex items-center justify-center gap-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-sm px-3 py-3 border border-primary transition"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

const DatabaseIcon = () => <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-white/20 text-white text-[10px] font-bold">DB</span>;

const ArrowBadge: React.FC<{ status: string }> = ({ status }) => {
  const color = status === 'complete'
    ? 'bg-emerald-100 text-emerald-600 border-emerald-200'
    : status === 'running'
      ? 'bg-amber-100 text-amber-600 border-amber-200'
      : 'bg-tertiary/10 text-secondary border-border';
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded-sm border ${color}`}>
      {status.toUpperCase()}
    </span>
  );
};

export default PersonalizedDashboard;
