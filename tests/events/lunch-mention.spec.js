import assert from 'node:assert';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { lunchMentionCallback } from '../../listeners/events/lunch-mention.js';

describe('events/lunch-mention', () => {
  let fakeClient;
  let fakeLogger;
  const originalChannelId = process.env.LUNCH_CHANNEL_ID;

  beforeEach(() => {
    process.env.LUNCH_CHANNEL_ID = 'C_LUNCH';
    fakeClient = {
      chat: {
        postEphemeral: mock.fn(),
      },
    };
    fakeLogger = {
      error: mock.fn(),
    };
  });

  afterEach(() => {
    process.env.LUNCH_CHANNEL_ID = originalChannelId;
  });

  it('does nothing when mentioned outside the configured channel', async () => {
    await lunchMentionCallback({
      event: { channel: 'C_OTHER', user: 'U123' },
      client: fakeClient,
      logger: fakeLogger,
    });

    assert.strictEqual(fakeClient.chat.postEphemeral.mock.callCount(), 0);
  });

  it('posts an ephemeral category prompt in the configured channel', async () => {
    await lunchMentionCallback({
      event: { channel: 'C_LUNCH', user: 'U123' },
      client: fakeClient,
      logger: fakeLogger,
    });

    assert.strictEqual(fakeClient.chat.postEphemeral.mock.callCount(), 1);

    const callArgs = fakeClient.chat.postEphemeral.mock.calls[0].arguments[0];
    assert.strictEqual(callArgs.channel, 'C_LUNCH');
    assert.strictEqual(callArgs.user, 'U123');
    assert.ok(callArgs.blocks.length > 0);
  });
});
