import { respondWithCandidates } from './lunch-category-select.js';

const lunchGenreSelectCallback = async ({ ack, body, respond, logger, db }) => {
  try {
    await ack();
    const [category, genre] = body.actions[0].selected_option.value.split('|');
    await respondWithCandidates({ category, genre, channelId: body.channel.id, respond, ...(db && { db }) });
  } catch (error) {
    logger.error(error);
  }
};

export { lunchGenreSelectCallback };
