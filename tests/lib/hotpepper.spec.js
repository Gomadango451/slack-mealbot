import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { fetchHotPepperShops, mapShopToRestaurant, RANGE_OPTIONS } from '../../listeners/lib/hotpepper.js';

const makeShop = (id, name) => ({
  id,
  name,
  genre: { name: 'イタリアン' },
  address: '東京都渋谷区1-1-1',
  lunch: 'あり',
  lat: 35.6595,
  lng: 139.7005,
  urls: { pc: `https://example.com/${id}` },
});

describe('lib/hotpepper', () => {
  describe('RANGE_OPTIONS', () => {
    it('has 5 entries covering 300m to 3000m', () => {
      assert.strictEqual(RANGE_OPTIONS.length, 5);
      assert.deepStrictEqual(
        RANGE_OPTIONS.map((option) => option.label),
        ['300m', '500m', '1000m', '2000m', '3000m'],
      );
      assert.deepStrictEqual(
        RANGE_OPTIONS.map((option) => option.meters),
        [300, 500, 1000, 2000, 3000],
      );
    });
  });

  describe('fetchHotPepperShops', () => {
    it('pages through results until maxCount is reached', async () => {
      const page1 = Array.from({ length: 100 }, (_, i) => makeShop(`s${i}`, `Shop ${i}`));
      const page2 = Array.from({ length: 50 }, (_, i) => makeShop(`s${100 + i}`, `Shop ${100 + i}`));

      const fetchImpl = mock.fn(async (url) => {
        const shop = url.searchParams.get('start') === '1' ? page1 : page2;
        return {
          ok: true,
          json: async () => ({ results: { results_available: 150, shop } }),
        };
      });

      const shops = await fetchHotPepperShops({
        lat: 35.0,
        lng: 139.0,
        rangeCode: '3',
        apiKey: 'dummy',
        maxCount: 150,
        fetchImpl,
      });

      assert.strictEqual(shops.length, 150);
      assert.strictEqual(fetchImpl.mock.callCount(), 2);
    });

    it('stops early when a page returns fewer results than requested', async () => {
      const fetchImpl = mock.fn(async () => ({
        ok: true,
        json: async () => ({
          results: {
            results_available: 10,
            shop: Array.from({ length: 10 }, (_, i) => makeShop(`s${i}`, `Shop ${i}`)),
          },
        }),
      }));

      const shops = await fetchHotPepperShops({ lat: 35, lng: 139, rangeCode: '1', apiKey: 'dummy', fetchImpl });

      assert.strictEqual(shops.length, 10);
      assert.strictEqual(fetchImpl.mock.callCount(), 1);
    });

    it('throws when the API responds with an error payload', async () => {
      const fetchImpl = mock.fn(async () => ({
        ok: true,
        json: async () => ({ results: { error: [{ code: 2000, message: 'キーが不正です' }] } }),
      }));

      await assert.rejects(
        () => fetchHotPepperShops({ lat: 35, lng: 139, rangeCode: '1', apiKey: 'bad', fetchImpl }),
        /キーが不正です/,
      );
    });

    it('throws on HTTP failure', async () => {
      const fetchImpl = mock.fn(async () => ({ ok: false, status: 500 }));

      await assert.rejects(
        () => fetchHotPepperShops({ lat: 35, lng: 139, rangeCode: '1', apiKey: 'dummy', fetchImpl }),
        /HTTP 500/,
      );
    });
  });

  describe('mapShopToRestaurant', () => {
    it('maps a Hot Pepper shop to the restaurants.json schema', () => {
      const restaurant = mapShopToRestaurant(makeShop('J999', 'サイゼリヤ 渋谷店'));

      assert.strictEqual(restaurant.id, 'hp_J999');
      assert.strictEqual(restaurant.name, 'サイゼリヤ 渋谷店');
      assert.strictEqual(restaurant.genre, 'イタリアン');
      assert.strictEqual(restaurant.hasLunch, true);
      assert.strictEqual(restaurant.address, '東京都渋谷区1-1-1');
      assert.strictEqual(restaurant.sourceUrl, 'https://example.com/J999');
      assert.strictEqual(restaurant.lat, 35.6595);
      assert.strictEqual(restaurant.lng, 139.7005);
    });

    it('normalizes near-duplicate genre names to their canonical form', () => {
      const shop = { ...makeShop('J111', '和食処 いろは'), genre: { name: '和食店' } };

      assert.strictEqual(mapShopToRestaurant(shop).genre, '和食');
    });

    it('sets hasLunch to false when the shop has no lunch menu', () => {
      const shop = { ...makeShop('J111', '町の定食屋 ふらっと'), lunch: '' };

      const restaurant = mapShopToRestaurant(shop);

      assert.strictEqual(restaurant.hasLunch, false);
    });
  });
});
