import { randomUUID } from 'node:crypto';
import { RequestError } from './store.js';

export const leaseMs = 20_000;
const sessionMs = 60 * 60_000;
const leaseConflict = (message, code) => Object.assign(new RequestError(409, message), { code });

export function collaboration({ now = Date.now, duration = leaseMs, allow = () => true } = {}) {
  const sessions = new Map();
  const locks = new Map();
  const tabs = new Map();
  const tabKey = (actor, workspace) => actor.id + '/' + workspace;
  const nodeKey = (workspace, node) => workspace + '/' + node;

  function clearTab(lease) {
    tabs.delete(lease.key);
    for (const [key, lock] of locks) {
      if (lock.tabToken === lease.token) locks.delete(key);
    }
  }
  function end(actor) {
    sessions.delete(actor.token);
    for (const lease of tabs.values()) {
      if (lease.sessionId === actor.id) clearTab(lease);
    }
  }
  function prune() {
    const time = now();
    for (const session of sessions.values()) if (session.expires <= time) end(session);
    for (const lease of tabs.values()) if (lease.expires <= time) clearTab(lease);
  }
  function check(actor) {
    prune();
    if (!actor || sessions.get(actor.token) !== actor || !allow(actor)) {
      if (actor) end(actor);
      throw new RequestError(403, 'Session สิ้นสุดหรือไม่มีสิทธิ์เข้าถึง');
    }
    actor.expires = now() + sessionMs;
    return actor;
  }
  function requireTab(actor, workspace, tabId, token) {
    check(actor);
    const lease = tabs.get(tabKey(actor, workspace));
    if (!lease || lease.tabId !== tabId || lease.token !== token) {
      throw leaseConflict('สิทธิ์แก้ไขของแท็บหมดอายุหรือย้ายไปแล้ว');
    }
    return lease;
  }
  function validateTabId(tabId) {
    if (typeof tabId !== 'string' || !/^[a-f0-9-]{36}$/.test(tabId)) {
      throw new RequestError(400, 'รหัสแท็บไม่ถูกต้อง');
    }
  }
  function newLease(actor, key, tabId) {
    return { key, sessionId: actor.id, tabId, token: randomUUID(), expires: now() + duration };
  }
  function newLock(actor, workspace, lease, nodeId) {
    return { workspace, nodeId, tabToken: lease.token, sessionId: actor.id,
      displayName: actor.displayName, token: randomUUID() };
  }

  return {
    create(rawName) {
      prune();
      const displayName = typeof rawName === 'string' ? rawName.trim() : '';
      if (!displayName) throw new RequestError(400, 'กรุณากรอกชื่อผู้แก้');
      const actor = { id: randomUUID(), token: randomUUID(), displayName, expires: now() + sessionMs };
      if (!allow(actor)) throw new RequestError(403, 'ไม่มีสิทธิ์เข้าถึง');
      sessions.set(actor.token, actor);
      return { id: actor.id, token: actor.token, displayName: actor.displayName };
    },
    authenticate(id) { return check(sessions.get(id)); },
    end,
    state(actor, workspace, tabId, renew = true) {
      check(actor);
      const lease = tabs.get(tabKey(actor, workspace));
      if (renew && lease?.tabId === tabId) lease.expires = now() + duration;
      return {
        editTab: lease ? (lease.tabId === tabId ? { token: lease.token } : { occupied: true }) : null,
        locks: [...locks.values()].filter(lock => lock.workspace === workspace).map(lock => ({
          nodeId: lock.nodeId, displayName: lock.displayName,
          editor: lock.sessionId.slice(0, 8), sameSession: lock.sessionId === actor.id,
          mine: lease?.tabId === tabId && lock.tabToken === lease.token,
          ...(lease?.tabId === tabId && lock.tabToken === lease.token && { token: lock.token }),
        })),
      };
    },
    takeTab(actor, workspace, tabId, rotate = false) {
      check(actor);
      validateTabId(tabId);
      const key = tabKey(actor, workspace);
      let previous = tabs.get(key);
      if (previous && previous.tabId !== tabId) throw leaseConflict('แท็บอื่นใน Session นี้กำลังแก้ผัง', 'TAB_OCCUPIED');
      if (previous && rotate) { clearTab(previous); previous = undefined; }
      const lease = previous || newLease(actor, key, tabId);
      lease.expires = now() + duration;
      tabs.set(key, lease);
      return this.state(actor, workspace, tabId);
    },
    startEdit(actor, workspace, tabId, nodeId) {
      check(actor);
      validateTabId(tabId);
      const key = tabKey(actor, workspace);
      const existingTab = tabs.get(key);
      const lockKey = nodeKey(workspace, nodeId);
      const existingLock = locks.get(lockKey);
      if (existingLock && existingLock.sessionId !== actor.id) {
        throw leaseConflict('Node นี้กำลังแก้โดย ' + existingLock.displayName, 'NODE_LOCKED');
      }
      if (existingTab && existingTab.tabId !== tabId) {
        throw leaseConflict('แท็บอื่นใน Session นี้กำลังแก้ผัง', 'TAB_OCCUPIED');
      }
      const lease = existingTab || newLease(actor, key, tabId);
      const lock = existingLock || newLock(actor, workspace, lease, nodeId);
      // Both conflicts have been checked before publishing either permission.
      tabs.set(key, lease);
      locks.set(lockKey, lock);
      return { ...this.state(actor, workspace, tabId), nodeToken: lock.token,
        createdTab: !existingTab, createdNode: !existingLock };
    },
    releaseTab(actor, workspace, tabId, token) {
      clearTab(requireTab(actor, workspace, tabId, token));
    },
    takeNode(actor, workspace, tabId, token, nodeId) {
      const lease = requireTab(actor, workspace, tabId, token);
      const key = nodeKey(workspace, nodeId);
      const previous = locks.get(key);
      if (previous && previous.tabToken !== lease.token) {
        throw leaseConflict('Node นี้กำลังแก้โดย ' + previous.displayName);
      }
      if (previous) return { token: previous.token };
      const lock = newLock(actor, workspace, lease, nodeId);
      locks.set(key, lock);
      return { token: lock.token };
    },
    releaseNode(actor, workspace, tabId, token, nodeId, nodeToken) {
      const lease = requireTab(actor, workspace, tabId, token);
      const key = nodeKey(workspace, nodeId);
      const lock = locks.get(key);
      if (lock?.tabToken === lease.token && lock.token === nodeToken) locks.delete(key);
    },
    invalidate(workspace, nodeId) {
      if (nodeId) locks.delete(nodeKey(workspace, nodeId));
      else for (const lease of tabs.values()) if (lease.key === tabKey({ id: lease.sessionId }, workspace)) clearTab(lease);
    },
    authorize(actor, workspace, input) {
      const lease = requireTab(actor, workspace, input.tabId, input.tabToken);
      for (const op of input.ops) {
        if (op.kind !== 'content') continue;
        const lock = locks.get(nodeKey(workspace, op.id));
        if (!lock || lock.tabToken !== lease.token || lock.token !== input.nodeTokens?.[op.id]) {
          throw leaseConflict('สิทธิ์แก้ไข Node หมดอายุหรือมีผู้แก้คนอื่น');
        }
      }
    },
  };
}
