import { logger } from '../src/lib/logger';

export type AuthModalContext = 'landing' | 'header' | 'lock' | 'settings' | 'guest-limit' | 'unknown';
export type AuthModalMode = 'signin' | 'signup';

interface AuthModalEventPayload {
  context: AuthModalContext;
  action: 'open' | 'submit' | 'success' | 'error';
  mode?: AuthModalMode;
  provider?: 'email' | 'google';
  errorCode?: string;
}

export const trackAuthModalEvent = (payload: AuthModalEventPayload) => {
  logger.info('analytics.auth_modal', { meta: payload });
};

type DashboardAction =
  | 'dashboard_view'
  | 'report_open'
  | 'bookmark_toggle';

interface DashboardEventPayload {
  action: DashboardAction;
  userId?: string;
  ticker?: string;
  isBookmarked?: boolean;
}

export const trackDashboardEvent = (payload: DashboardEventPayload) => {
  logger.info('analytics.dashboard', { meta: payload });
};
