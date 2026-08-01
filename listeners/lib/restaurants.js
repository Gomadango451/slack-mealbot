import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { haversineMeters } from './geo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'restaurants.json');

export const CATEGORIES = {
  LUNCH: 'lunch',
  DINNER: 'dinner',
};

let cachedRestaurants;

export const loadRestaurants = () => {
  if (!cachedRestaurants) {
    cachedRestaurants = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  }
  return cachedRestaurants;
};

// Writes the list to disk and keeps the in-memory cache in sync so a subsequent
// loadRestaurants() call (e.g. from the same running process) sees the new data.
export const saveRestaurants = (list, dataPath = DATA_PATH) => {
  writeFileSync(dataPath, `${JSON.stringify(list, null, 2)}\n`);
  if (dataPath === DATA_PATH) {
    cachedRestaurants = list;
  }
};

const DUPLICATE_DISTANCE_METERS = 100;

const normalizeName = (name) =>
  name
    .normalize('NFKC')
    .replace(/[\s　]/g, '')
    .toLowerCase();

// Different data sources (Hot Pepper, Google Places) generate unrelated ids for the same
// real-world restaurant, so an id match alone can't catch cross-source duplicates. We treat
// two restaurants as "the same place" when their names match (normalized, one containing the
// other counts) and, if both have coordinates, they're within DUPLICATE_DISTANCE_METERS of
// each other. Without coordinates on either side (e.g. manually-added restaurants), name
// matching alone decides it.
const isSameRestaurant = (a, b) => {
  const nameA = normalizeName(a.name ?? '');
  const nameB = normalizeName(b.name ?? '');
  if (!nameA || !nameB) return false;
  const namesMatch = nameA === nameB || nameA.includes(nameB) || nameB.includes(nameA);
  if (!namesMatch) return false;

  if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
    return haversineMeters(a.lat, a.lng, b.lat, b.lng) <= DUPLICATE_DISTANCE_METERS;
  }
  return true;
};

// Merges freshly fetched restaurants into an existing list, keyed by id. Entries with the
// same id (a re-fetch of the same source) are replaced by the incoming (fresher) version.
// Entries that look like the same real-world restaurant under a different id (see
// isSameRestaurant) are skipped — the existing entry wins, the incoming one is dropped.
export const mergeRestaurants = (existing, incoming) => {
  const byId = new Map(existing.map((restaurant) => [restaurant.id, restaurant]));

  for (const restaurant of incoming) {
    if (byId.has(restaurant.id)) {
      byId.set(restaurant.id, restaurant);
      continue;
    }
    const isDuplicate = [...byId.values()].some((other) => isSameRestaurant(other, restaurant));
    if (isDuplicate) continue;
    byId.set(restaurant.id, restaurant);
  }

  return [...byId.values()];
};

const shuffle = (items) => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Excludes recently shown restaurants, but falls back to the full pool
// when exclusion would leave fewer than `count` candidates.
export const selectFromPool = (pool, excludeIds = [], count = 3) => {
  const excludeSet = new Set(excludeIds);
  const filtered = pool.filter((restaurant) => !excludeSet.has(restaurant.id));
  const candidates = filtered.length >= count ? filtered : pool;
  return shuffle(candidates).slice(0, count);
};

// There's no "dinner" flag in the source data (nearly every restaurant serves dinner),
// so ディナー is unfiltered. ランチ excludes only restaurants explicitly known to have no
// lunch menu (hasLunch === false); unset/unknown (e.g. manually-added restaurants) still match.
export const matchesMealCategory = (restaurant, category) => {
  if (category === CATEGORIES.DINNER) return true;
  return restaurant.hasLunch !== false;
};

// An empty/falsy genre means "any genre" (the おまかせ option).
export const matchesGenre = (restaurant, genre) => !genre || restaurant.genre === genre;

// Genres actually available for a category, most common first, for building the
// genre-select menu. Restaurants with no genre set are ignored (nothing to offer).
export const getAvailableGenres = (category, restaurants = loadRestaurants()) => {
  const counts = new Map();
  for (const restaurant of restaurants) {
    if (!restaurant.genre) continue;
    if (!matchesMealCategory(restaurant, category)) continue;
    counts.set(restaurant.genre, (counts.get(restaurant.genre) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([genre]) => genre);
};

export const pickCandidates = (category, genre, excludeIds = [], count = 3, restaurants = loadRestaurants()) => {
  const pool = restaurants.filter(
    (restaurant) => matchesMealCategory(restaurant, category) && matchesGenre(restaurant, genre),
  );
  return selectFromPool(pool, excludeIds, count);
};
