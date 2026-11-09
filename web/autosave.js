export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, method = 'GET', body, { token, timeout = 15000, keepalive = false, binary = false } = {}) {
  const response = await fetch(path, {
    method,
    headers: {
      ...(token && { Authorization: 'Bearer ' + token }),
      ...(body && { 'Content-Type': 'application/json' }),
    },
    ...(body && { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(timeout),
    keepalive,
  });
  if (binary && response.ok) return response.blob();
  const result = await response.json();
  if (!response.ok) throw new ApiError(result.error, response.status);
  return result;
}

// A new draft can accumulate while an older snapshot is in flight. Its success
// must never acknowledge the newer draft. A lost response retries the same ID.
export function autosave({ snapshot, send, acknowledge, show }) {
  let edit = 0;
  let saved = 0;
  let timer;
  let pending;
  let running;
  let failed = false;
  let stopped = false;

  function mark() {
    edit++;
    if (failed || stopped) return;
    show('saving');
    if (!timer && !running) timer = setTimeout(flush, 350);
  }

  async function drain() {
    while (!stopped && edit !== saved) {
      try {
        pending ??= { edit, body: snapshot() };
        const result = await send(pending.body);
        if (stopped) return false;
        acknowledge(pending.body, result);
        saved = pending.edit;
        pending = null;
      } catch (error) {
        if (stopped) return false;
        // A server rejection is definite. Transport failures may have committed.
        if (error instanceof ApiError) pending = null;
        failed = true;
        show('error', error instanceof ApiError ? error.message : 'เชื่อมต่อที่เก็บข้อมูลไม่ได้');
        return false;
      }
    }
    if (stopped || edit !== saved) return false;
    show('saved');
    return true;
  }

  function flush() {
    clearTimeout(timer);
    timer = undefined;
    if (running) return running;
    if (stopped) return Promise.resolve(false);
    if (edit === saved) return Promise.resolve(true);
    failed = false;
    show('saving');
    running = drain().finally(() => { running = null; });
    return running;
  }

  return {
    mark, flush, dirty: () => edit !== saved, pending: () => pending?.body,
    stop() { stopped = true; clearTimeout(timer); timer = undefined; },
  };
}
