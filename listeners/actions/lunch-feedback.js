import { lunchDb } from '../lib/db.js';
import { loadRestaurants } from '../lib/restaurants.js';

const RATING_LABELS = {
  went: '行った',
  good: '良かった',
  meh: 'イマイチ',
};

const createFeedbackCallback =
  (rating) =>
  async ({ ack, body, respond, logger, db = lunchDb, restaurants = loadRestaurants() }) => {
    try {
      await ack();
      const restaurantId = body.actions[0].value;
      const restaurant = restaurants.find((item) => item.id === restaurantId);
      const restaurantName = restaurant?.name ?? restaurantId;

      db.recordFeedback(body.channel.id, restaurantId, restaurantName, rating, body.user.id);

      await respond({
        response_type: 'ephemeral',
        replace_original: false,
        text: `${restaurantName} への「${RATING_LABELS[rating]}」を記録しました:pencil:`,
      });
    } catch (error) {
      logger.error(error);
    }
  };

const lunchFeedbackWentCallback = createFeedbackCallback('went');
const lunchFeedbackGoodCallback = createFeedbackCallback('good');
const lunchFeedbackMehCallback = createFeedbackCallback('meh');

export { lunchFeedbackGoodCallback, lunchFeedbackMehCallback, lunchFeedbackWentCallback };
