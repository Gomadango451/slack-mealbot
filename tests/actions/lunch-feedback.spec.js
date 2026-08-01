import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import {
  lunchFeedbackGoodCallback,
  lunchFeedbackMehCallback,
  lunchFeedbackWentCallback,
} from '../../listeners/actions/lunch-feedback.js';

describe('actions/lunch-feedback', () => {
  let fakeDb;
  let fakeRespond;
  let fakeAck;
  let fakeLogger;

  const fakeRestaurants = [{ id: 'r001', name: 'サイゼリヤ' }];

  beforeEach(() => {
    fakeDb = {
      recordFeedback: mock.fn(),
    };
    fakeRespond = mock.fn();
    fakeAck = mock.fn();
    fakeLogger = { error: mock.fn() };
  });

  const callFeedback = (callback, restaurantId) =>
    callback({
      ack: fakeAck,
      body: { actions: [{ value: restaurantId }], channel: { id: 'C123' }, user: { id: 'U123' } },
      respond: fakeRespond,
      logger: fakeLogger,
      db: fakeDb,
      restaurants: fakeRestaurants,
    });

  it('records "went" feedback with the resolved restaurant name', async () => {
    await callFeedback(lunchFeedbackWentCallback, 'r001');

    assert.strictEqual(fakeAck.mock.callCount(), 1);
    assert.strictEqual(fakeDb.recordFeedback.mock.callCount(), 1);

    const [channelId, restaurantId, restaurantName, rating, userId] = fakeDb.recordFeedback.mock.calls[0].arguments;
    assert.strictEqual(channelId, 'C123');
    assert.strictEqual(restaurantId, 'r001');
    assert.strictEqual(restaurantName, 'サイゼリヤ');
    assert.strictEqual(rating, 'went');
    assert.strictEqual(userId, 'U123');
    assert.strictEqual(fakeRespond.mock.callCount(), 1);
    assert.strictEqual(fakeRespond.mock.calls[0].arguments[0].replace_original, false);
  });

  it('records "good" feedback', async () => {
    await callFeedback(lunchFeedbackGoodCallback, 'r001');

    assert.strictEqual(fakeDb.recordFeedback.mock.calls[0].arguments[3], 'good');
  });

  it('records "meh" feedback', async () => {
    await callFeedback(lunchFeedbackMehCallback, 'r001');

    assert.strictEqual(fakeDb.recordFeedback.mock.calls[0].arguments[3], 'meh');
  });

  it('falls back to the raw id when the restaurant is unknown', async () => {
    await callFeedback(lunchFeedbackWentCallback, 'unknown-id');

    assert.strictEqual(fakeDb.recordFeedback.mock.calls[0].arguments[2], 'unknown-id');
  });
});
