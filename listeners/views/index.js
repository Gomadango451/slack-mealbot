import { mealSettingsViewCallback } from './meal-settings-view.js';
import { sampleViewCallback } from './sample-view.js';

export const register = (app) => {
  app.view('sample_view_id', sampleViewCallback);
  app.view('meal_settings_view', mealSettingsViewCallback);
};
