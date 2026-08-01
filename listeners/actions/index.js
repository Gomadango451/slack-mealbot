import { FETCH_CONFIRM_ACTION_IDS } from '../lib/lunch-fetch-flow.js';
import {
  CATEGORY_ACTION_IDS,
  CHANGE_GENRE_ACTION_ID,
  FEEDBACK_ACTION_IDS,
  GENRE_SELECT_ACTION_ID,
  SHUFFLE_ACTION_ID,
} from '../lib/lunch-flow.js';
import { CATEGORIES } from '../lib/restaurants.js';
import { lunchCategorySelectCallback } from './lunch-category-select.js';
import { lunchChangeGenreCallback } from './lunch-change-genre.js';
import { lunchFeedbackGoodCallback, lunchFeedbackMehCallback, lunchFeedbackWentCallback } from './lunch-feedback.js';
import {
  lunchFetchCancelCallback,
  lunchFetchMergeCallback,
  lunchFetchOverwriteCallback,
} from './lunch-fetch-confirm.js';
import { lunchGenreSelectCallback } from './lunch-genre-select.js';
import { lunchShuffleCallback } from './lunch-shuffle.js';
import { sampleActionCallback } from './sample-action.js';

export const register = (app) => {
  app.action('sample_action_id', sampleActionCallback);

  app.action(CATEGORY_ACTION_IDS[CATEGORIES.LUNCH], lunchCategorySelectCallback);
  app.action(CATEGORY_ACTION_IDS[CATEGORIES.DINNER], lunchCategorySelectCallback);
  app.action(GENRE_SELECT_ACTION_ID, lunchGenreSelectCallback);
  app.action(CHANGE_GENRE_ACTION_ID, lunchChangeGenreCallback);
  app.action(SHUFFLE_ACTION_ID, lunchShuffleCallback);
  app.action(FEEDBACK_ACTION_IDS.went, lunchFeedbackWentCallback);
  app.action(FEEDBACK_ACTION_IDS.good, lunchFeedbackGoodCallback);
  app.action(FEEDBACK_ACTION_IDS.meh, lunchFeedbackMehCallback);

  app.action(FETCH_CONFIRM_ACTION_IDS.overwrite, lunchFetchOverwriteCallback);
  app.action(FETCH_CONFIRM_ACTION_IDS.merge, lunchFetchMergeCallback);
  app.action(FETCH_CONFIRM_ACTION_IDS.cancel, lunchFetchCancelCallback);
};
