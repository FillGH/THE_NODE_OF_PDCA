export class ApiError extends Error {}

export async function api(path, method = 'GET', body) {
  const response = await fetch(path, {
    method,
    ...(body && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) throw new ApiError(result.error);
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

  function mark() {
    edit++;
    if (failed) return;
    show('saving');
    if (!timer && !running) timer = setTimeout(flush, 350);
  }

  async function drain() {
    while (edit !== saved) {
      try {
        pending ??= { edit, body: snapshot() };
        const result = await send(pending.body);
        acknowledge(pending.body, result);
        saved = pending.edit;
        pending = null;
      } catch (error) {
        // A server rejection is definite. Transport failures may have committed.
        if (error instanceof ApiError) pending = null;
        failed = true;
        show('error', error instanceof ApiError ? error.message : 'เชื่อมต่อที่เก็บข้อมูลไม่ได้');
        return false;
      }
    }
    show('saved');
    return true;
  }

  function flush() {
    clearTimeout(timer);
    timer = undefined;
    if (running) return running;
    if (edit === saved) return Promise.resolve(true);
    failed = false;
    show('saving');
    running = drain().finally(() => { running = null; });
    return running;
  }

  return { mark, flush, dirty: () => edit !== saved };
}
