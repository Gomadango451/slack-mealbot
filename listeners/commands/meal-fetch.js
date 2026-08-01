import { lunchDb } from '../lib/db.js';
import { fetchGooglePlacesShops, mapPlaceToRestaurant } from '../lib/google-places.js';
import { fetchHotPepperShops, mapShopToRestaurant, RANGE_OPTIONS } from '../lib/hotpepper.js';
import { buildFetchSummaryBlocks, pendingFetchStore } from '../lib/lunch-fetch-flow.js';
import { loadRestaurants } from '../lib/restaurants.js';

const mealFetchCommandCallback = async ({
  ack,
  respond,
  body,
  logger,
  db = lunchDb,
  fetchHotPepper = fetchHotPepperShops,
  fetchGooglePlaces = fetchGooglePlacesShops,
  store = pendingFetchStore,
}) => {
  try {
    await ack();

    const hotpepperApiKey = process.env.HOTPEPPER_API_KEY;
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!hotpepperApiKey && !googleApiKey) {
      await respond(
        'HOTPEPPER_API_KEY と GOOGLE_PLACES_API_KEY のどちらも設定されていません。.envに追加してアプリを再起動してください。',
      );
      return;
    }

    const settings = db.getSettings();
    if (!settings) {
      await respond('検索地点が未設定です。先に `/meal-settings` で検索地点を設定してください。');
      return;
    }

    const radiusMeters = RANGE_OPTIONS.find((option) => option.code === settings.rangeCode)?.meters;

    const [shops, places] = await Promise.all([
      hotpepperApiKey
        ? fetchHotPepper({
            lat: settings.lat,
            lng: settings.lng,
            rangeCode: settings.rangeCode,
            apiKey: hotpepperApiKey,
          })
        : [],
      googleApiKey
        ? fetchGooglePlaces({ lat: settings.lat, lng: settings.lng, radiusMeters, apiKey: googleApiKey })
        : [],
    ]);

    const restaurants = [...shops.map(mapShopToRestaurant), ...places.map(mapPlaceToRestaurant)];
    const lunchCount = restaurants.filter((restaurant) => restaurant.hasLunch).length;
    const token = store.save(restaurants, body.user_id);

    const sourceLabel = [
      hotpepperApiKey && `ホットペッパーグルメAPI(${shops.length}件)`,
      googleApiKey && `Google Places API(${places.length}件)`,
    ]
      .filter(Boolean)
      .join(' + ');

    await respond({
      response_type: 'ephemeral',
      blocks: buildFetchSummaryBlocks(token, {
        sourceLabel,
        fetchedCount: restaurants.length,
        existingCount: loadRestaurants().length,
        lunchCount,
        nonLunchCount: restaurants.length - lunchCount,
      }),
    });
  } catch (error) {
    logger.error(error);
    await respond(`データ取得中にエラーが発生しました: ${error.message}`);
  }
};

export { mealFetchCommandCallback };
