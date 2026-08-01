import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { lunchDmCallback } from '../../listeners/messages/lunch-dm.js';

describe('messages/lunch-dm', () => {
  let fakeClient;
  let fakeLogger;
  let fakeContext;

  beforeEach(() => {
    fakeClient = {
      chat: {
        postEphemeral: mock.fn(),
      },
    };
    fakeLogger = {
      error: mock.fn(),
    };
    fakeContext = { botUserId: 'U_BOT' };
  });

  it('ignores messages outside of direct messages', async () => {
    await lunchDmCallback({
      message: { channel_type: 'channel', channel: 'C123', user: 'U123', text: '<@U_BOT> hi' },
      context: fakeContext,
      client: fakeClient,
      logger: fakeLogger,
    });

    assert.strictEqual(fakeClient.chat.postEphemeral.mock.callCount(), 0);
  });

  it('ignores bot messages and message subtypes in DMs', async () => {
    await lunchDmCallback({
      message: { channel_type: 'im', channel: 'D123', user: 'U123', bot_id: 'B123', text: '<@U_BOT>' },
      context: fakeContext,
      client: fakeClient,
      logger: fakeLogger,
    });

    assert.strictEqual(fakeClient.chat.postEphemeral.mock.callCount(), 0);
  });

  it('ignores a plain DM that does not mention the bot', async () => {
    await lunchDmCallback({
      message: { channel_type: 'im', channel: 'D123', user: 'U123', text: 'lunch' },
      context: fakeContext,
      client: fakeClient,
      logger: fakeLogger,
    });

    assert.strictEqual(fakeClient.chat.postEphemeral.mock.callCount(), 0);
  });

  it('posts an ephemeral category prompt when the bot is actually mentioned in the DM', async () => {
    await lunchDmCallback({
      message: { channel_type: 'im', channel: 'D123', user: 'U123', text: '<@U_BOT> ランチ教えて' },
      context: fakeContext,
      client: fakeClient,
      logger: fakeLogger,
    });

    assert.strictEqual(fakeClient.chat.postEphemeral.mock.callCount(), 1);

    const callArgs = fakeClient.chat.postEphemeral.mock.calls[0].arguments[0];
    assert.strictEqual(callArgs.channel, 'D123');
    assert.strictEqual(callArgs.user, 'U123');
  });
});
