import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { lunchChangeGenreCallback } from '../../listeners/actions/lunch-change-genre.js';
import { CATEGORIES } from '../../listeners/lib/restaurants.js';

describe('actions/lunch-change-genre', () => {
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

  it('returns to the genre picker for the category carried in the button value', async () => {
    const getGenres = mock.fn(() => ['イタリアン', '和食']);

    await lunchChangeGenreCallback({
      ack: fakeAck,
      body: { actions: [{ value: CATEGORIES.LUNCH }], channel: { id: 'C999' } },
      respond: fakeRespond,
      logger: fakeLogger,
      db: fakeDb,
      getGenres,
    });

    assert.strictEqual(fakeAck.mock.callCount(), 1);
    assert.strictEqual(getGenres.mock.calls[0].arguments[0], CATEGORIES.LUNCH);
    assert.strictEqual(fakeRespond.mock.callCount(), 1);
  });

  it('logs the error and does not throw if respond fails', async () => {
    const failingRespond = mock.fn(() => {
      throw new Error('boom');
    });

    await lunchChangeGenreCallback({
      ack: fakeAck,
      body: { actions: [{ value: CATEGORIES.LUNCH }], channel: { id: 'C999' } },
      respond: failingRespond,
      logger: fakeLogger,
      db: fakeDb,
      getGenres: mock.fn(() => []),
    });

    assert.strictEqual(fakeLogger.error.mock.callCount(), 1);
  });
});
