import { mealFetchCommandCallback } from './meal-fetch.js';
import { mealSettingsCommandCallback } from './meal-settings.js';
import { sampleCommandCallback } from './sample-command.js';

export const register = (app) => {
  app.command('/sample-command', sampleCommandCallback);
  app.command('/meal-settings', mealSettingsCommandCallback);
  app.command('/meal-fetch', mealFetchCommandCallback);
};
