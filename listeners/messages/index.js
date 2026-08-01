import { lunchDmCallback } from './lunch-dm.js';
import { sampleMessageCallback } from './sample-message.js';

export const register = (app) => {
  app.message(/^(hi|hello|hey).*/, sampleMessageCallback);
  app.message(lunchDmCallback);
};
