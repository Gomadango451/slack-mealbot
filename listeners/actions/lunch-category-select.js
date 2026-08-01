import { lunchDb } from '../lib/db.js';
import { buildCandidatesBlocks, buildGenrePromptBlocks } from '../lib/lunch-flow.js';
import { getAvailableGenres, pickCandidates } from '../lib/restaurants.js';

const respondWithCandidates = async ({ category, genre = '', channelId, respond, db = lunchDb }) => {
  const excludeIds = db.getRecentlyShownIds(channelId);
  const candidates = pickCandidates(category, genre, excludeIds);

  if (candidates.length > 0) {
    db.recordShown(channelId, category, candidates);
  }

  await respond({
    replace_original: true,
    blocks: buildCandidatesBlocks(category, candidates, genre),
  });
};

// Shared by the initial ランチ/ディナー button handler and the 🔄 ジャンルを変える button:
// both just need to show the genre picker for a given category (or skip straight to
// candidates if there's no genre data to filter by).
const respondWithGenrePrompt = async ({ category, channelId, respond, db, getGenres = getAvailableGenres }) => {
  const genres = getGenres(category);

  if (genres.length === 0) {
    await respondWithCandidates({ category, channelId, respond, ...(db && { db }) });
    return;
  }

  await respond({
    replace_original: true,
    blocks: buildGenrePromptBlocks(category, genres),
  });
};

const lunchCategorySelectCallback = async ({ ack, body, respond, logger, db, getGenres }) => {
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

export { lunchCategorySelectCallback, respondWithCandidates, respondWithGenrePrompt };
