import assert from 'node:assert';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { mealFetchCommandCallback } from '../../listeners/commands/meal-fetch.js';

describe('commands/meal-fetch', () => {
  let fakeAck;
  let fakeRespond;
  let fakeLogger;
  let fakeDb;
  let fakeFetchHotPepper;
  let fakeFetchGooglePlaces;
  let fakeStore;
  const originalHotpepperKey = process.env.HOTPEPPER_API_KEY;
  const originalGoogleKey = process.env.GOOGLE_PLACES_API_KEY;

  beforeEach(() => {
    process.env.HOTPEPPER_API_KEY = 'hp-dummy-key';
    process.env.GOOGLE_PLACES_API_KEY = 'gp-dummy-key';
    fakeAck = mock.fn();
    fakeRespond = mock.fn();
    fakeLogger = { error: mock.fn() };
    fakeDb = { getSettings: mock.fn(() => ({ lat: 35, lng: 139, rangeCode: '3' })) };
    fakeFetchHotPepper = mock.fn(async () => [{ id: 's1', name: 'サイゼリヤ', genre: { name: 'イタリアン' } }]);
    fakeFetchGooglePlaces = mock.fn(async () => [
      { id: 'p1', displayName: { text: '町の定食屋' }, primaryTypeDisplayName: { text: '定食' } },
    ]);
    fakeStore = { save: mock.fn(() => 'tok123') };
  });

  afterEach(() => {
    process.env.HOTPEPPER_API_KEY = originalHotpepperKey;
    process.env.GOOGLE_PLACES_API_KEY = originalGoogleKey;
  });

  const call = (overrides = {}) =>
    mealFetchCommandCallback({
      ack: fakeAck,
      respond: fakeRespond,
      body: { user_id: 'U123' },
      logger: fakeLogger,
      db: fakeDb,
      fetchHotPepper: fakeFetchHotPepper,
      fetchGooglePlaces: fakeFetchGooglePlaces,
      store: fakeStore,
      ...overrides,
    });

  it('errors out when both API keys are missing', async () => {
    delete process.env.HOTPEPPER_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;

    await call();

    assert.strictEqual(fakeFetchHotPepper.mock.callCount(), 0);
    assert.strictEqual(fakeFetchGooglePlaces.mock.callCount(), 0);
    const message = String(fakeRespond.mock.calls[0].arguments[0]);
    assert.ok(message.includes('HOTPEPPER_API_KEY'));
    assert.ok(message.includes('GOOGLE_PLACES_API_KEY'));
  });

  it('errors out when no search settings have been saved', async () => {
    fakeDb.getSettings = mock.fn(() => null);

    await call();

    assert.strictEqual(fakeFetchHotPepper.mock.callCount(), 0);
    assert.ok(String(fakeRespond.mock.calls[0].arguments[0]).includes('/meal-settings'));
  });

  it('only fetches from Hot Pepper when GOOGLE_PLACES_API_KEY is missing', async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;

    await call();

    assert.strictEqual(fakeFetchHotPepper.mock.callCount(), 1);
    assert.strictEqual(fakeFetchGooglePlaces.mock.callCount(), 0);

    const [restaurants] = fakeStore.save.mock.calls[0].arguments;
    assert.strictEqual(restaurants.length, 1);
    assert.strictEqual(restaurants[0].id, 'hp_s1');
  });

  it('only fetches from Google Places when HOTPEPPER_API_KEY is missing', async () => {
    delete process.env.HOTPEPPER_API_KEY;

    await call();

    assert.strictEqual(fakeFetchHotPepper.mock.callCount(), 0);
    assert.strictEqual(fakeFetchGooglePlaces.mock.callCount(), 1);

    const [restaurants] = fakeStore.save.mock.calls[0].arguments;
    assert.strictEqual(restaurants.length, 1);
    assert.strictEqual(restaurants[0].id, 'gp_p1');
  });

  it('fetches from both sources and combines them when both keys are set', async () => {
    await call();

    assert.strictEqual(fakeFetchHotPepper.mock.callCount(), 1);
    assert.strictEqual(fakeFetchGooglePlaces.mock.callCount(), 1);

    const [restaurants] = fakeStore.save.mock.calls[0].arguments;
    assert.strictEqual(restaurants.length, 2);
    assert.ok(restaurants.some((r) => r.id === 'hp_s1'));
    assert.ok(restaurants.some((r) => r.id === 'gp_p1'));

    assert.strictEqual(fakeRespond.mock.callCount(), 1);
    const respondArgs = fakeRespond.mock.calls[0].arguments[0];
    assert.strictEqual(respondArgs.response_type, 'ephemeral');
    const summaryText = respondArgs.blocks[0].text.text;
    assert.ok(summaryText.includes('ホットペッパーグルメAPI(1件)'));
    assert.ok(summaryText.includes('Google Places API(1件)'));
  });

  it('responds with an error message when one of the API calls throws', async () => {
    fakeFetchGooglePlaces = mock.fn(async () => {
      throw new Error('Google Places APIエラー: キーが不正です');
    });

    await call({ fetchGooglePlaces: fakeFetchGooglePlaces });

    assert.strictEqual(fakeLogger.error.mock.callCount(), 1);
    assert.ok(String(fakeRespond.mock.calls[0].arguments[0]).includes('キーが不正です'));
  });
});
