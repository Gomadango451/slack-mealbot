import { normalizeGenre } from './genre-normalization.js';

const API_URL = 'https://webservice.recruit.co.jp/hotpepper/gourmet/v1/';
const MAX_PAGE_SIZE = 100;

// Maps the UI label to the Hot Pepper API's `range` param code. `meters` is reused by
// other data sources (e.g. Google Places) that take a plain radius instead of a code.
export const RANGE_OPTIONS = [
  { code: '1', label: '300m', meters: 300 },
  { code: '2', label: '500m', meters: 500 },
  { code: '3', label: '1000m', meters: 1000 },
  { code: '4', label: '2000m', meters: 2000 },
  { code: '5', label: '3000m', meters: 3000 },
];

export const fetchHotPepperShops = async ({ lat, lng, rangeCode, apiKey, maxCount = 200, fetchImpl = fetch }) => {
  const shops = [];
  let start = 1;

  while (shops.length < maxCount) {
    const count = Math.min(MAX_PAGE_SIZE, maxCount - shops.length);
    const url = new URL(API_URL);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lng', String(lng));
    url.searchParams.set('range', rangeCode);
    url.searchParams.set('count', String(count));
    url.searchParams.set('start', String(start));
    url.searchParams.set('format', 'json');

    const response = await fetchImpl(url);

    if (!response.ok) {
      throw new Error(`ホットペッパーAPIの呼び出しに失敗しました (HTTP ${response.status})`);
    }

    const body = await response.json();

    if (body.results?.error) {
      const [firstError] = body.results.error;
      throw new Error(`ホットペッパーAPIエラー: ${firstError?.message ?? '不明なエラー'}`);
    }

    const page = body.results?.shop ?? [];
    shops.push(...page);

    const resultsAvailable = body.results?.results_available ?? 0;
    if (page.length < count || shops.length >= resultsAvailable) break;

    start += count;
  }

  return shops.slice(0, maxCount);
};

export const mapShopToRestaurant = (shop) => ({
  id: `hp_${shop.id}`,
  name: shop.name,
  genre: normalizeGenre(shop.genre?.name ?? ''),
  hasLunch: shop.lunch === 'あり',
  address: shop.address ?? undefined,
  sourceUrl: shop.urls?.pc ?? undefined,
  lat: shop.lat != null ? Number(shop.lat) : undefined,
  lng: shop.lng != null ? Number(shop.lng) : undefined,
});
