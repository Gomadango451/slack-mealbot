import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { fetchGooglePlacesShops, mapPlaceToRestaurant } from '../../listeners/lib/google-places.js';

const CENTER = { lat: 35.6895, lng: 139.6917 };

const makePlace = (id, { lat = CENTER.lat, lng = CENTER.lng } = {}) => ({
  id,
  displayName: { text: `Shop ${id}` },
  primaryTypeDisplayName: { text: 'レストラン' },
  formattedAddress: '東京都',
  googleMapsUri: `https://maps.google.com/?cid=${id}`,
  location: { latitude: lat, longitude: lng },
});

describe('lib/google-places', () => {
  describe('fetchGooglePlacesShops', () => {
    it('pages through results using nextPageToken', async () => {
      const page1 = Array.from({ length: 20 }, (_, i) => makePlace(`a${i}`));
      const page2 = Array.from({ length: 5 }, (_, i) => makePlace(`b${i}`));
      const sleepImpl = mock.fn(async () => {});

      const fetchImpl = mock.fn(async (_url, options) => {
        const body = JSON.parse(options.body);
        const isFirstPage = !body.pageToken;
        return {
          ok: true,
          json: async () => (isFirstPage ? { places: page1, nextPageToken: 'tok2' } : { places: page2 }),
        };
      });

      const shops = await fetchGooglePlacesShops({
        lat: CENTER.lat,
        lng: CENTER.lng,
        radiusMeters: 1000,
        apiKey: 'dummy',
        fetchImpl,
        sleepImpl,
      });

      assert.strictEqual(shops.length, 25);
      assert.strictEqual(fetchImpl.mock.callCount(), 2);
      assert.strictEqual(sleepImpl.mock.callCount(), 1);

      const [, secondCallOptions] = fetchImpl.mock.calls[1].arguments;
      assert.strictEqual(JSON.parse(secondCallOptions.body).pageToken, 'tok2');
      assert.strictEqual(secondCallOptions.headers['X-Goog-Api-Key'], 'dummy');
      assert.ok(secondCallOptions.headers['X-Goog-FieldMask'].includes('places.servesLunch'));
    });

    it('requests Japanese-language results', async () => {
      const fetchImpl = mock.fn(async () => ({
        ok: true,
        json: async () => ({ places: [] }),
      }));

      await fetchGooglePlacesShops({ lat: CENTER.lat, lng: CENTER.lng, radiusMeters: 500, apiKey: 'dummy', fetchImpl });

      const [, options] = fetchImpl.mock.calls[0].arguments;
      const body = JSON.parse(options.body);
      assert.strictEqual(body.languageCode, 'ja');
      assert.strictEqual(body.regionCode, 'JP');
    });

    it('stops once maxCount is reached, trimming the overshoot', async () => {
      const fetchImpl = mock.fn(async () => ({
        ok: true,
        json: async () => ({
          places: Array.from({ length: 20 }, (_, i) => makePlace(`a${i}`)),
          nextPageToken: 'tok2',
        }),
      }));

      const shops = await fetchGooglePlacesShops({
        lat: CENTER.lat,
        lng: CENTER.lng,
        radiusMeters: 1000,
        apiKey: 'dummy',
        maxCount: 25,
        fetchImpl,
        sleepImpl: async () => {},
      });

      assert.strictEqual(shops.length, 25);
      assert.strictEqual(fetchImpl.mock.callCount(), 2);
    });

    it('drops results outside the configured radius (locationBias is only a soft hint)', async () => {
      const near = makePlace('near', { lat: CENTER.lat + 0.001, lng: CENTER.lng }); // ~110m away
      const far = makePlace('far', { lat: CENTER.lat + 1, lng: CENTER.lng }); // ~111km away

      const fetchImpl = mock.fn(async () => ({
        ok: true,
        json: async () => ({ places: [near, far] }),
      }));

      const shops = await fetchGooglePlacesShops({
        lat: CENTER.lat,
        lng: CENTER.lng,
        radiusMeters: 500,
        apiKey: 'dummy',
        fetchImpl,
      });

      assert.strictEqual(shops.length, 1);
      assert.strictEqual(shops[0].id, 'near');
    });

    it('throws a descriptive error on HTTP failure', async () => {
      const fetchImpl = mock.fn(async () => ({ ok: false, status: 403 }));

      await assert.rejects(
        () => fetchGooglePlacesShops({ lat: CENTER.lat, lng: CENTER.lng, radiusMeters: 500, apiKey: 'bad', fetchImpl }),
        /HTTP 403/,
      );
    });
  });

  describe('mapPlaceToRestaurant', () => {
    it('maps a Google Place to the restaurants.json schema', () => {
      const place = makePlace('ChIJ123');
      place.servesLunch = true;

      const restaurant = mapPlaceToRestaurant(place);

      assert.strictEqual(restaurant.id, 'gp_ChIJ123');
      assert.strictEqual(restaurant.name, 'Shop ChIJ123');
      assert.strictEqual(restaurant.genre, '洋食'); // 'レストラン' is normalized to '洋食'
      assert.strictEqual(restaurant.hasLunch, true);
      assert.strictEqual(restaurant.address, '東京都');
      assert.strictEqual(restaurant.sourceUrl, 'https://maps.google.com/?cid=ChIJ123');
      assert.strictEqual(restaurant.lat, CENTER.lat);
      assert.strictEqual(restaurant.lng, CENTER.lng);
    });

    it('normalizes near-duplicate genre names to their canonical form', () => {
      const place = makePlace('a');
      place.primaryTypeDisplayName = { text: 'カフェ・喫茶' };

      assert.strictEqual(mapPlaceToRestaurant(place).genre, 'カフェ・スイーツ');
    });

    it('sets hasLunch to false when servesLunch is explicitly false', () => {
      const place = makePlace('a');
      place.servesLunch = false;

      assert.strictEqual(mapPlaceToRestaurant(place).hasLunch, false);
    });

    it('leaves hasLunch undefined when servesLunch is not present', () => {
      const place = makePlace('a');

      assert.strictEqual(mapPlaceToRestaurant(place).hasLunch, undefined);
    });

    it('falls back to types[0] when primaryTypeDisplayName is missing', () => {
      const place = makePlace('a');
      place.primaryTypeDisplayName = undefined;
      place.types = ['cafe', 'food'];

      assert.strictEqual(mapPlaceToRestaurant(place).genre, 'cafe');
    });
  });
});
