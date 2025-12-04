const channelName = 'ultramagnus-auth-sync';

export type AuthEvent =
  | { type: 'login'; userId: string }
  | { type: 'logout' };

let channel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  channel = new BroadcastChannel(channelName);
}

export const broadcast = (event: AuthEvent) => {
  channel?.postMessage(event);
};

export const subscribe = (handler: (event: AuthEvent) => void) => {
  if (!channel) return () => {};
  const listener = (e: MessageEvent) => handler(e.data as AuthEvent);
  channel.addEventListener('message', listener);
  return () => channel?.removeEventListener('message', listener);
};
