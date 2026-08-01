import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { lunchShuffleCallback } from '../../listeners/actions/lunch-shuffle.js';
import { CATEGORIES } from '../../listeners/lib/restaurants.js';

describe('actions/lunch-shuffle', () => {
  let fakeDb;
  let fakeRespond;
  let fakeAck;
  let fakeLogger;

  beforeEach(() => {
    fakeDb = {
      getRecentlyShownIds: mock.fn(() => []),
      recordShown: mock.fn(),
    };
    fakeRespond = mock.fn();
    fakeAck = mock.fn();
    fakeLogger = { error: mock.fn() };
  });

  it('re-runs candidate selection for the category/genre carried in the button value', async () => {
    await lunchShuffleCallback({
      ack: fakeAck,
      body: { actions: [{ value: `${CATEGORIES.DINNER}|イタリアン` }], channel: { id: 'C999' } },
      respond: fakeRespond,
      logger: fakeLogger,
      db: fakeDb,
    });

    assert.strictEqual(fakeAck.mock.callCount(), 1);
    assert.strictEqual(fakeDb.getRecentlyShownIds.mock.callCount(), 1);
    assert.strictEqual(fakeRespond.mock.callCount(), 1);

    const callArgs = fakeRespond.mock.calls[0].arguments[0];
    assert.strictEqual(callArgs.replace_original, true);
  });

  it('works with an おまかせ (empty genre) value', async () => {
    await lunchShuffleCallback({
      ack: fakeAck,
      body: { actions: [{ value: `${CATEGORIES.LUNCH}|` }], channel: { id: 'C999' } },
      respond: fakeRespond,
      logger: fakeLogger,
      db: fakeDb,
    });

    assert.strictEqual(fakeRespond.mock.callCount(), 1);
  });
});
