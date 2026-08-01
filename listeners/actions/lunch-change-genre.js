import { respondWithGenrePrompt } from './lunch-category-select.js';

const lunchChangeGenreCallback = async ({ ack, body, respond, logger, db, getGenres }) => {
  try {
    await ack();
    const category = body.actions[0].value;
    await respondWithGenrePrompt({
      category,
      channelId: body.channel.id,
      respond,
      ...(db && { db }),
      ...(getGenres && { getGenres }),
    });
  } catch (error) {
    logger.error(error);
  }
};

export { lunchChangeGenreCallback };
