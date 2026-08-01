import { appHomeOpenedCallback } from './app-home-opened.js';
import { lunchMentionCallback } from './lunch-mention.js';

export const register = (app) => {
  app.event('app_home_opened', appHomeOpenedCallback);
  app.event('app_mention', lunchMentionCallback);
};
