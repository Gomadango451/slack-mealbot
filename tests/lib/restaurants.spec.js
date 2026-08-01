import assert from 'node:assert';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  CATEGORIES,
  getAvailableGenres,
  matchesGenre,
  matchesMealCategory,
  mergeRestaurants,
  pickCandidates,
  saveRestaurants,
  selectFromPool,
} from '../../listeners/lib/restaurants.js';

describe('lib/restaurants', () => {
  describe('selectFromPool', () => {
    const pool = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
      { id: 'd', name: 'D' },
    ];

    it('excludes the given ids when enough candidates remain', () => {
      const result = selectFromPool(pool, ['a'], 3);

      assert.strictEqual(result.length, 3);
      assert.ok(result.every((item) => item.id !== 'a'));
    });

    it('falls back to the full pool when exclusion leaves too few candidates', () => {
      const result = selectFromPool(pool, ['a', 'b', 'c'], 3);

      assert.strictEqual(result.length, 3);
    });

    it('returns at most `count` items', () => {
      const result = selectFromPool(pool, [], 2);

      assert.strictEqual(result.length, 2);
    });
  });

  describe('matchesMealCategory', () => {
    it('excludes only restaurants explicitly known to have no lunch menu', () => {
      assert.strictEqual(matchesMealCategory({ hasLunch: true }, CATEGORIES.LUNCH), true);
      assert.strictEqual(matchesMealCategory({ hasLunch: false }, CATEGORIES.LUNCH), false);
      assert.strictEqual(matchesMealCategory({}, CATEGORIES.LUNCH), true);
    });

    it('never filters out restaurants for dinner (no dinner flag exists)', () => {
      assert.strictEqual(matchesMealCategory({ hasLunch: false }, CATEGORIES.DINNER), true);
      assert.strictEqual(matchesMealCategory({}, CATEGORIES.DINNER), true);
    });
  });

  describe('matchesGenre', () => {
    it('matches any restaurant when genre is empty (おまかせ)', () => {
      assert.strictEqual(matchesGenre({ genre: 'イタリアン' }, ''), true);
      assert.strictEqual(matchesGenre({ genre: undefined }, ''), true);
    });

    it('matches only restaurants with the exact genre otherwise', () => {
      assert.strictEqual(matchesGenre({ genre: 'イタリアン' }, 'イタリアン'), true);
      assert.strictEqual(matchesGenre({ genre: '和食' }, 'イタリアン'), false);
    });
  });

  describe('getAvailableGenres', () => {
    const restaurants = [
      { id: 'r001', name: 'A', genre: 'イタリアン', hasLunch: true },
      { id: 'r002', name: 'B', genre: 'イタリアン', hasLunch: true },
      { id: 'r003', name: 'C', genre: '和食', hasLunch: true },
      { id: 'r004', name: 'D', genre: '居酒屋', hasLunch: false },
      { id: 'r005', name: 'E', hasLunch: true },
    ];

    it('returns genres present in the category pool, most common first', () => {
      assert.deepStrictEqual(getAvailableGenres(CATEGORIES.LUNCH, restaurants), ['イタリアン', '和食']);
    });

    it('excludes genres from restaurants filtered out by the category', () => {
      assert.deepStrictEqual(getAvailableGenres(CATEGORIES.DINNER, restaurants), ['イタリアン', '和食', '居酒屋']);
    });

    it('returns an empty array when nothing has a genre', () => {
      assert.deepStrictEqual(getAvailableGenres(CATEGORIES.LUNCH, [{ id: 'r001', name: 'A' }]), []);
    });
  });

  describe('pickCandidates', () => {
    const restaurants = [
      { id: 'r001', name: 'ランチもやる店', genre: 'イタリアン', hasLunch: true },
      { id: 'r002', name: 'ランチなし居酒屋', genre: '居酒屋', hasLunch: false },
      { id: 'r003', name: '不明な店', genre: 'イタリアン' },
    ];

    it('excludes hasLunch:false restaurants for the lunch category', () => {
      const result = pickCandidates(CATEGORIES.LUNCH, '', [], 5, restaurants);

      assert.ok(result.some((r) => r.id === 'r001'));
      assert.ok(result.some((r) => r.id === 'r003'));
      assert.ok(!result.some((r) => r.id === 'r002'));
    });

    it('includes every restaurant for the dinner category when genre is おまかせ', () => {
      const result = pickCandidates(CATEGORIES.DINNER, '', [], 5, restaurants);

      assert.strictEqual(result.length, 3);
    });

    it('further filters by genre when one is given', () => {
      const result = pickCandidates(CATEGORIES.DINNER, 'イタリアン', [], 5, restaurants);

      assert.strictEqual(result.length, 2);
      assert.ok(result.every((r) => r.genre === 'イタリアン'));
    });
  });

  describe('mergeRestaurants', () => {
    it('keeps existing entries and appends new ones', () => {
      const existing = [{ id: 'r001', name: 'Manual A' }];
      const incoming = [{ id: 'hp_1', name: 'Hotpepper A' }];

      const merged = mergeRestaurants(existing, incoming);

      assert.strictEqual(merged.length, 2);
      assert.ok(merged.some((r) => r.id === 'r001'));
      assert.ok(merged.some((r) => r.id === 'hp_1'));
    });

    it('lets incoming entries overwrite existing ones with the same id', () => {
      const existing = [{ id: 'hp_1', name: 'Old name' }];
      const incoming = [{ id: 'hp_1', name: 'New name' }];

      const merged = mergeRestaurants(existing, incoming);

      assert.strictEqual(merged.length, 1);
      assert.strictEqual(merged[0].name, 'New name');
    });

    it('collapses a cross-source duplicate (same name, close coordinates) into one entry', () => {
      const existing = [{ id: 'hp_1', name: 'サイゼリヤ 渋谷店', lat: 35.658, lng: 139.7016 }];
      const incoming = [{ id: 'gp_1', name: 'サイゼリヤ 渋谷店', lat: 35.6581, lng: 139.70165 }];

      const merged = mergeRestaurants(existing, incoming);

      assert.strictEqual(merged.length, 1);
      assert.strictEqual(merged[0].id, 'hp_1'); // the existing (first-seen) entry wins
    });

    it('keeps both when the name matches but the coordinates are far apart', () => {
      const existing = [{ id: 'hp_1', name: 'サイゼリヤ', lat: 35.658, lng: 139.7016 }];
      const incoming = [{ id: 'gp_1', name: 'サイゼリヤ', lat: 35.69, lng: 139.75 }]; // several km away

      const merged = mergeRestaurants(existing, incoming);

      assert.strictEqual(merged.length, 2);
    });

    it('falls back to name-only matching when coordinates are missing on either side', () => {
      const existing = [{ id: 'r001', name: 'サイゼリヤ 渋谷店' }]; // manually-added, no coords
      const incoming = [{ id: 'gp_1', name: 'サイゼリヤ 渋谷店', lat: 35.658, lng: 139.7016 }];

      const merged = mergeRestaurants(existing, incoming);

      assert.strictEqual(merged.length, 1);
    });

    it('treats a name that fully contains the other as a match (documents a known false-positive risk)', () => {
      const existing = [{ id: 'hp_1', name: 'サイゼリヤ' }];
      const incoming = [{ id: 'gp_1', name: 'サイゼリヤ二郎' }]; // different place, but contains the other's name

      const merged = mergeRestaurants(existing, incoming);

      assert.strictEqual(merged.length, 1);
    });
  });

  describe('saveRestaurants', () => {
    let tempDir;
    let tempPath;

    beforeEach(() => {
      tempDir = mkdtempSync(path.join(tmpdir(), 'lunch-restaurants-'));
      tempPath = path.join(tempDir, 'restaurants.json');
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('writes the list as formatted JSON', () => {
      const list = [{ id: 'r001', name: 'Sample', genre: 'テスト' }];

      saveRestaurants(list, tempPath);

      const written = JSON.parse(readFileSync(tempPath, 'utf8'));
      assert.deepStrictEqual(written, list);
    });
  });
});
