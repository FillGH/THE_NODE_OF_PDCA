import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, autosave } from '../web/autosave.js';

test('a late acknowledgement does not clear newer edits and ambiguous retries keep the original snapshot', async () => {
  const attempts = [];
  const states = [];
  let draft = 'first';
  let firstReply;
  const saver = autosave({
    snapshot: () => draft,
    send: async body => {
      attempts.push(body);
      if (attempts.length === 1) await new Promise((resolve, reject) => { firstReply = reject; });
      if (attempts.length === 3) assert.equal(saver.dirty(), true);
      return { revision: attempts.length };
    },
    acknowledge: () => {},
    show: state => states.push(state),
  });
  saver.mark();
  const saving = saver.flush();
  draft = 'newer';
  saver.mark();
  firstReply(new Error('response lost'));
  assert.equal(await saving, false);
  assert.equal(saver.dirty(), true);
  assert.equal(states.at(-1), 'error');
  assert.equal(await saver.flush(), true);
  assert.deepEqual(attempts, ['first', 'first', 'newer']);
  assert.equal(saver.dirty(), false);
  assert.equal(states.at(-1), 'saved');
});

test('retry after a definite rejection uses the newest draft', async () => {
  const attempts = [];
  let draft = 'rejected';
  const saver = autosave({
    snapshot: () => draft,
    async send(body) {
      attempts.push(body);
      if (attempts.length === 1) throw new ApiError('write rolled back');
      return {};
    },
    acknowledge: () => {},
    show: () => {},
  });
  saver.mark();
  assert.equal(await saver.flush(), false);
  draft = 'fixed';
  saver.mark();
  assert.equal(await saver.flush(), true);
  assert.deepEqual(attempts, ['rejected', 'fixed']);
});
