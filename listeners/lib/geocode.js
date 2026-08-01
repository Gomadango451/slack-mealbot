// Uses OpenStreetMap's Nominatim search API (free, no API key required) to turn a
// free-text address into coordinates for the Hot Pepper Gourmet Search API's lat/lng params.
// Usage policy: https://operations.osmfoundation.org/policies/nominatim/
// (max ~1 request/sec, requires an identifying User-Agent). This is only called once per
// manual /meal-settings save, so we stay well within that policy without extra throttling.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'bolt-js-lunch-bot (personal, non-commercial Slack app)';

export const geocodeAddress = async (address, { fetchImpl = fetch } = {}) => {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');

  const response = await fetchImpl(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`ジオコーディングに失敗しました (HTTP ${response.status})`);
  }

  const results = await response.json();

  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(`住所「${address}」の位置情報が見つかりませんでした`);
  }

  const [{ lat, lon }] = results;

  return { lat: Number.parseFloat(lat), lng: Number.parseFloat(lon) };
};
