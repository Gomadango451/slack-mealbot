import { buildCategoryPromptBlocks } from '../lib/lunch-flow.js';

const lunchMentionCallback = async ({ event, client, logger }) => {
  try {
    if (event.channel !== process.env.LUNCH_CHANNEL_ID) return;

    await client.chat.postEphemeral({
      channel: event.channel,
      user: event.user,
      text: '今日のランチ、どっちの気分？',
      blocks: buildCategoryPromptBlocks(),
    });
  } catch (error) {
    logger.error(error);
  }
};

export { lunchMentionCallback };
