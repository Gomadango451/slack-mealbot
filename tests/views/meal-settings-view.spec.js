import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { mealSettingsViewCallback } from '../../listeners/views/meal-settings-view.js';

describe('views/meal-settings-view', () => {
  let fakeDb;
  let fakeClient;
  let fakeAck;
  let fakeLogger;
  let fakeGeocode;
  let fakeView;
  let fakeBody;

  beforeEach(() => {
    fakeDb = { saveSettings: mock.fn() };
    fakeClient = { chat: { postMessage: mock.fn() } };
    fakeAck = mock.fn();
    fakeLogger = { error: mock.fn() };
    fakeGeocode = mock.fn(async () => ({ lat: 35.0, lng: 139.0 }));
    fakeBody = { user: { id: 'U123' } };
    fakeView = {
      state: {
        values: {
          meal_settings_address_block: { meal_settings_address_input: { value: '東京都新宿区' } },
          meal_settings_range_block: { meal_settings_range_select: { selected_option: { value: '3' } } },
        },
      },
    };
  });

  it('geocodes the address, saves settings, and DMs a success message', async () => {
    await mealSettingsViewCallback({
      ack: fakeAck,
      view: fakeView,
      body: fakeBody,
      client: fakeClient,
      logger: fakeLogger,
      db: fakeDb,
      geocode: fakeGeocode,
    });

    assert.strictEqual(fakeAck.mock.callCount(), 1);
    assert.strictEqual(fakeGeocode.mock.calls[0].arguments[0], '東京都新宿区');
    assert.strictEqual(fakeDb.saveSettings.mock.callCount(), 1);
    assert.deepStrictEqual(fakeDb.saveSettings.mock.calls[0].arguments[0], {
      address: '東京都新宿区',
      lat: 35.0,
      lng: 139.0,
      rangeCode: '3',
      updatedBy: 'U123',
    });

    assert.strictEqual(fakeClient.chat.postMessage.mock.callCount(), 1);
    const callArgs = fakeClient.chat.postMessage.mock.calls[0].arguments[0];
    assert.strictEqual(callArgs.channel, 'U123');
    assert.ok(callArgs.text.includes('保存しました'));
  });

  it('DMs a failure message and does not save when geocoding fails', async () => {
    fakeGeocode = mock.fn(async () => {
      throw new Error('住所が見つかりませんでした');
    });

    await mealSettingsViewCallback({
      ack: fakeAck,
      view: fakeView,
      body: fakeBody,
      client: fakeClient,
      logger: fakeLogger,
      db: fakeDb,
      geocode: fakeGeocode,
    });

    assert.strictEqual(fakeDb.saveSettings.mock.callCount(), 0);
    assert.strictEqual(fakeLogger.error.mock.callCount(), 1);

    const callArgs = fakeClient.chat.postMessage.mock.calls[0].arguments[0];
    assert.ok(callArgs.text.includes('失敗'));
  });
});
