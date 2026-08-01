import { normalizeGenre } from './genre-normalization.js';
import { haversineMeters } from './geo.js';

const API_URL = 'https://places.googleapis.com/v1/places:searchText';
const PAGE_SIZE = 20;
const NEW_PAGE_TOKEN_DELAY_MS = 1500;

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.primaryTypeDisplayName',
  'places.servesLunch',
  'places.googleMapsUri',
  'nextPageToken',
].join(',');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Text Search (New) caps at 20 results/page and 60 total across pageToken pages — there is
// no way to fetch more than that in a single search. `locationBias` is a soft hint (results
// outside it can still come back), so we post-filter by actual distance to honor the radius
// the user configured in /meal-settings.
export const fetchGooglePlacesShops = async ({
  lat,
  lng,
  radiusMeters,
  apiKey,
  maxCount = 60,
  textQuery = 'レストラン',
  fetchImpl = fetch,
  sleepImpl = sleep,
}) => {
  const places = [];
  let pageToken;

  while (places.length < maxCount) {
    const response = await fetchImpl(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        languageCode: 'ja',
        regionCode: 'JP',
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
        pageSize: PAGE_SIZE,
        ...(pageToken && { pageToken }),
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Places APIの呼び出しに失敗しました (HTTP ${response.status})`);
    }

    const body = await response.json();
    const page = body.places ?? [];
    places.push(...page);

    if (!body.nextPageToken || page.length === 0) break;
    pageToken = body.nextPageToken;
    await sleepImpl(NEW_PAGE_TOKEN_DELAY_MS);
  }

  const withinRadius = places.filter((place) => {
    if (!place.location) return true;
    return haversineMeters(lat, lng, place.location.latitude, place.location.longitude) <= radiusMeters;
  });

  return withinRadius.slice(0, maxCount);
};

export const mapPlaceToRestaurant = (place) => ({
  id: `gp_${place.id}`,
  name: place.displayName?.text ?? '',
  genre: normalizeGenre(place.primaryTypeDisplayName?.text ?? place.types?.[0] ?? ''),
  hasLunch: typeof place.servesLunch === 'boolean' ? place.servesLunch : undefined,
  address: place.formattedAddress ?? undefined,
  sourceUrl: place.googleMapsUri ?? undefined,
  lat: place.location?.latitude,
  lng: place.location?.longitude,
});
