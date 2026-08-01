import { buildCategoryPromptBlocks } from '../lib/lunch-flow.js';

// Only reacts when the bot is actually @mentioned inside the DM (not just any message,
// and not any text that happens to contain the word "lunch") — this keeps the trigger
// consistent with the channel-side app_mention behavior.
const lunchDmCallback = async ({ message, context, client, logger }) => {
  try {
    if (message.channel_type !== 'im') return;
    if (message.subtype || message.bot_id) return;
    if (!message.text?.includes(`<@${context.botUserId}>`)) return;

    await client.chat.postEphemeral({
      channel: message.channel,
      user: message.user,
      text: 'ランチ、それともディナー？',
      blocks: buildCategoryPromptBlocks(),
    });
  } catch (error) {
    logger.error(error);
  }
};

export { lunchDmCallback };
