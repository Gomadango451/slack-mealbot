import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import {
  lunchFetchCancelCallback,
  lunchFetchMergeCallback,
  lunchFetchOverwriteCallback,
} from '../../listeners/actions/lunch-fetch-confirm.js';

describe('actions/lunch-fetch-confirm', () => {
  let fakeAck;
  let fakeRespond;
  let fakeLogger;
  let fakeStore;
  let pendingRestaurants;

  beforeEach(() => {
    fakeAck = mock.fn();
    fakeRespond = mock.fn();
    fakeLogger = { error: mock.fn() };
    pendingRestaurants = [{ id: 'hp_1', name: 'Sample' }];
    fakeStore = {
      take: mock.fn((token) =>
        token === 'tok123' ? { restaurants: pendingRestaurants, requestedBy: 'U1' } : undefined,
      ),
    };
  });

  const bodyWithToken = (token) => ({ actions: [{ value: token }] });

  describe('overwrite', () => {
    it('saves the fetched list and confirms', async () => {
      const save = mock.fn();

      await lunchFetchOverwriteCallback({
        ack: fakeAck,
        body: bodyWithToken('tok123'),
        respond: fakeRespond,
        logger: fakeLogger,
        store: fakeStore,
        save,
      });

      assert.strictEqual(save.mock.callCount(), 1);
      assert.deepStrictEqual(save.mock.calls[0].arguments[0], pendingRestaurants);
      assert.ok(fakeRespond.mock.calls[0].arguments[0].text.includes('上書き保存'));
    });

    it('shows an expired message for an unknown token', async () => {
      const save = mock.fn();

      await lunchFetchOverwriteCallback({
        ack: fakeAck,
        body: bodyWithToken('missing'),
        respond: fakeRespond,
        logger: fakeLogger,
        store: fakeStore,
        save,
      });

      assert.strictEqual(save.mock.callCount(), 0);
      assert.ok(fakeRespond.mock.calls[0].arguments[0].text.includes('有効期限'));
    });
  });

  describe('merge', () => {
    it('merges with existing data and confirms', async () => {
      const load = mock.fn(() => [{ id: 'r001', name: 'Manual' }]);
      const merge = mock.fn((existing, incoming) => [...existing, ...incoming]);
      const save = mock.fn();

      await lunchFetchMergeCallback({
        ack: fakeAck,
        body: bodyWithToken('tok123'),
        respond: fakeRespond,
        logger: fakeLogger,
        store: fakeStore,
        load,
        merge,
        save,
      });

      assert.strictEqual(merge.mock.callCount(), 1);
      assert.strictEqual(save.mock.callCount(), 1);
      assert.strictEqual(save.mock.calls[0].arguments[0].length, 2);
      assert.ok(fakeRespond.mock.calls[0].arguments[0].text.includes('マージ'));
    });
  });

  describe('cancel', () => {
    it('discards the pending entry and confirms', async () => {
      await lunchFetchCancelCallback({
        ack: fakeAck,
        body: bodyWithToken('tok123'),
        respond: fakeRespond,
        logger: fakeLogger,
        store: fakeStore,
      });

      assert.strictEqual(fakeStore.take.mock.callCount(), 1);
      assert.ok(fakeRespond.mock.calls[0].arguments[0].text.includes('キャンセル'));
    });
  });
});
