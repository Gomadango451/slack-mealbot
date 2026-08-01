import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import {
  lunchCategorySelectCallback,
  respondWithCandidates,
  respondWithGenrePrompt,
} from '../../listeners/actions/lunch-category-select.js';
import { CATEGORIES } from '../../listeners/lib/restaurants.js';

describe('actions/lunch-category-select', () => {
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

  describe('respondWithCandidates', () => {
    it('picks candidates, records them, and responds with replace_original', async () => {
      await respondWithCandidates({ category: CATEGORIES.DINNER, channelId: 'C123', respond: fakeRespond, db: fakeDb });

      assert.strictEqual(fakeDb.getRecentlyShownIds.mock.callCount(), 1);
      assert.strictEqual(fakeDb.recordShown.mock.callCount(), 1);
      assert.strictEqual(fakeRespond.mock.callCount(), 1);

      const callArgs = fakeRespond.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.replace_original, true);
      assert.ok(callArgs.blocks.length > 0);
    });
  });

  describe('respondWithGenrePrompt', () => {
    it('shows the genre picker when genres are available for the category', async () => {
      const getGenres = mock.fn(() => ['イタリアン', '和食']);

      await respondWithGenrePrompt({ category: CATEGORIES.LUNCH, channelId: 'C123', respond: fakeRespond, getGenres });

      assert.strictEqual(getGenres.mock.calls[0].arguments[0], CATEGORIES.LUNCH);
      assert.strictEqual(fakeDb.recordShown.mock.callCount(), 0);
      assert.strictEqual(fakeRespond.mock.callCount(), 1);

      const callArgs = fakeRespond.mock.calls[0].arguments[0];
      const selectBlock = callArgs.blocks.flatMap((b) => b.elements ?? []).find((el) => el.type === 'static_select');
      assert.ok(selectBlock);
      assert.strictEqual(selectBlock.options.length, 3); // おまかせ + 2 genres
    });

    it('skips straight to candidates when no genres are available', async () => {
      const getGenres = mock.fn(() => []);

      await respondWithGenrePrompt({
        category: CATEGORIES.LUNCH,
        channelId: 'C123',
        respond: fakeRespond,
        db: fakeDb,
        getGenres,
      });

      assert.strictEqual(fakeDb.getRecentlyShownIds.mock.callCount(), 1);
      assert.strictEqual(fakeRespond.mock.callCount(), 1);
    });
  });

  describe('lunchCategorySelectCallback', () => {
    it('acks and shows the genre prompt using injected db/getGenres', async () => {
      const getGenres = mock.fn(() => ['イタリアン']);

      await lunchCategorySelectCallback({
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

      await lunchCategorySelectCallback({
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
});
