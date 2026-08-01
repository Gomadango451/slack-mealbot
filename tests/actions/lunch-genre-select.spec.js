import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { lunchGenreSelectCallback } from '../../listeners/actions/lunch-genre-select.js';
import { CATEGORIES } from '../../listeners/lib/restaurants.js';

describe('actions/lunch-genre-select', () => {
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

  it('parses category and genre from the selected option and shows candidates', async () => {
    await lunchGenreSelectCallback({
      ack: fakeAck,
      body: {
        actions: [{ selected_option: { value: `${CATEGORIES.LUNCH}|イタリアン` } }],
        channel: { id: 'C999' },
      },
      respond: fakeRespond,
      logger: fakeLogger,
      db: fakeDb,
    });

    assert.strictEqual(fakeAck.mock.callCount(), 1);
    assert.strictEqual(fakeDb.getRecentlyShownIds.mock.calls[0].arguments[0], 'C999');
    assert.strictEqual(fakeRespond.mock.callCount(), 1);
  });

  it('handles the おまかせ option (empty genre)', async () => {
    await lunchGenreSelectCallback({
      ack: fakeAck,
      body: {
        actions: [{ selected_option: { value: `${CATEGORIES.DINNER}|` } }],
        channel: { id: 'C999' },
      },
      respond: fakeRespond,
      logger: fakeLogger,
      db: fakeDb,
    });

    assert.strictEqual(fakeRespond.mock.callCount(), 1);
  });

  it('logs the error and does not throw if respond fails', async () => {
    const failingRespond = mock.fn(() => {
      throw new Error('boom');
    });

    await lunchGenreSelectCallback({
      ack: fakeAck,
      body: {
        actions: [{ selected_option: { value: `${CATEGORIES.LUNCH}|イタリアン` } }],
        channel: { id: 'C999' },
      },
      respond: failingRespond,
      logger: fakeLogger,
      db: fakeDb,
    });

    assert.strictEqual(fakeLogger.error.mock.callCount(), 1);
  });
});
