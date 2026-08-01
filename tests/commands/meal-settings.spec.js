import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { mealSettingsCommandCallback } from '../../listeners/commands/meal-settings.js';

describe('commands/meal-settings', () => {
  let fakeDb;
  let fakeClient;
  let fakeAck;
  let fakeLogger;

  beforeEach(() => {
    fakeDb = { getSettings: mock.fn(() => null) };
    fakeClient = { views: { open: mock.fn() } };
    fakeAck = mock.fn();
    fakeLogger = { error: mock.fn() };
  });

  it('opens a modal with default values when no settings exist', async () => {
    await mealSettingsCommandCallback({
      ack: fakeAck,
      body: { trigger_id: 'T123' },
      client: fakeClient,
      logger: fakeLogger,
      db: fakeDb,
    });

    assert.strictEqual(fakeAck.mock.callCount(), 1);
    assert.strictEqual(fakeClient.views.open.mock.callCount(), 1);

    const callArgs = fakeClient.views.open.mock.calls[0].arguments[0];
    assert.strictEqual(callArgs.trigger_id, 'T123');
    assert.strictEqual(callArgs.view.callback_id, 'meal_settings_view');
  });

  it('prefills the address and range from existing settings', async () => {
    fakeDb.getSettings = mock.fn(() => ({ address: '大阪府大阪市', rangeCode: '2' }));

    await mealSettingsCommandCallback({
      ack: fakeAck,
      body: { trigger_id: 'T123' },
      client: fakeClient,
      logger: fakeLogger,
      db: fakeDb,
    });

    const view = fakeClient.views.open.mock.calls[0].arguments[0].view;
    const addressBlock = view.blocks.find((block) => block.block_id === 'meal_settings_address_block');
    const rangeBlock = view.blocks.find((block) => block.block_id === 'meal_settings_range_block');

    assert.strictEqual(addressBlock.element.initial_value, '大阪府大阪市');
    assert.strictEqual(rangeBlock.element.initial_option.value, '2');
  });
});
