const randomSegment = () => Math.random().toString(36).slice(2, 8);

export const generateRequestId = (prefix = 'req') => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const timestamp = Date.now().toString(36);
  return `${prefix}_${timestamp}-${randomSegment()}-${randomSegment()}`;
};

const sessionId = generateRequestId('session');

export const getSessionId = () => sessionId;
