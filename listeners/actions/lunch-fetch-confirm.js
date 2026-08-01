import { pendingFetchStore } from '../lib/lunch-fetch-flow.js';
import { loadRestaurants, mergeRestaurants, saveRestaurants } from '../lib/restaurants.js';

const respondExpired = (respond) =>
  respond({
    replace_original: true,
    text: '取得結果の有効期限が切れました。もう一度 `/lunch-fetch` を実行してください。',
  });

const lunchFetchOverwriteCallback = async ({
  ack,
  body,
  respond,
  logger,
  store = pendingFetchStore,
  save = saveRestaurants,
}) => {
  try {
    await ack();
    const token = body.actions[0].value;
    const entry = store.take(token);
    if (!entry) {
      await respondExpired(respond);
      return;
    }

    save(entry.restaurants);

    await respond({
      replace_original: true,
      text: `:white_check_mark: ${entry.restaurants.length}件で上書き保存しました。`,
    });
  } catch (error) {
    logger.error(error);
  }
};

const lunchFetchMergeCallback = async ({
  ack,
  body,
  respond,
  logger,
  store = pendingFetchStore,
  load = loadRestaurants,
  merge = mergeRestaurants,
  save = saveRestaurants,
}) => {
  try {
    await ack();
    const token = body.actions[0].value;
    const entry = store.take(token);
    if (!entry) {
      await respondExpired(respond);
      return;
    }

    const merged = merge(load(), entry.restaurants);
    save(merged);

    await respond({
      replace_original: true,
      text: `:white_check_mark: ${entry.restaurants.length}件をマージし、合計${merged.length}件になりました。`,
    });
  } catch (error) {
    logger.error(error);
  }
};

const lunchFetchCancelCallback = async ({ ack, body, respond, logger, store = pendingFetchStore }) => {
  try {
    await ack();
    const token = body.actions[0].value;
    store.take(token);

    await respond({ replace_original: true, text: 'キャンセルしました。' });
  } catch (error) {
    logger.error(error);
  }
};

export { lunchFetchCancelCallback, lunchFetchMergeCallback, lunchFetchOverwriteCallback };
