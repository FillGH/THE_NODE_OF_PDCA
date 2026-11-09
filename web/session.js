import { api } from './autosave.js';

export function browserSession({ onEnter, onExit, onLogin, onMessage }) {
  const channel = new BroadcastChannel('pdca-collaboration-v2');
  const tabId = crypto.randomUUID();
  let actor;
  let nonce;
  let epoch = 0;

  function send(type, fields = {}) {
    channel.postMessage({ type, ...fields, session: actor?.id });
  }
  function exit(reason, broadcast = false) {
    if (broadcast && actor) send('end', { reason });
    epoch++;
    nonce = undefined;
    actor = undefined;
    onExit(reason);
  }
  function enter(next) {
    epoch++;
    nonce = undefined;
    actor = next;
    onEnter(next);
  }
  async function request(path, method, body, options) {
    const current = actor;
    const generation = epoch;
    if (!current) throw new Error('Session สิ้นสุดแล้ว');
    try {
      const result = await api(path, method, body, { ...options, token: current.token });
      if (epoch !== generation) throw new Error('Session เปลี่ยนแล้ว');
      return result;
    } catch (error) {
      if (error.status === 403 && epoch === generation) exit(error.message, true);
      throw error;
    }
  }
  function discover() {
    const ask = nonce = crypto.randomUUID();
    channel.postMessage({ type: 'discover', ask });
    setTimeout(() => {
      if (nonce !== ask) return;
      nonce = undefined;
      onLogin();
    }, 250);
  }
  channel.addEventListener('message', async ({ data }) => {
    if (!data || typeof data !== 'object') return;
    if (data.type === 'discover' && actor) {
      send('join', { ask: data.ask, actor });
    } else if (data.type === 'join' && nonce && data.ask === nonce && !actor) {
      const ask = nonce;
      nonce = undefined;
      const generation = epoch;
      try {
        const next = await api('/api/session', 'GET', undefined, { token: data.actor.token, timeout: 2500 });
        if (epoch === generation) {
          enter({ ...next, token: data.actor.token });
          send('draft-request', { ask });
        }
      } catch (error) {
        if (epoch === generation) onLogin(error.message);
      }
    } else if (actor && data.session === actor.id) {
      if (data.type === 'end') exit(data.reason || 'จบ Session แล้ว');
      else onMessage(data);
    }
  });

  return {
    tabId, discover, request, send,
    active: () => !!actor,
    async start(displayName) {
      const generation = epoch;
      const next = await api('/api/session', 'POST', { displayName });
      if (epoch === generation) enter(next);
    },
    finish() {
      const token = actor?.token;
      exit('จบ Session แล้ว', true);
      if (token) api('/api/session', 'DELETE', undefined, { token, keepalive: true, timeout: 3000 }).catch(() => {});
    },
    hide() {
      // A page kept in the browser's back/forward cache must rediscover a live
      // sibling. Never reuse its old credentials or draft after restoration.
      exit(null);
    },
  };
}
