import assert from 'node:assert';
import { describe, it } from 'node:test';
import { normalizeGenre } from '../../listeners/lib/genre-normalization.js';

describe('lib/genre-normalization', () => {
  it('maps known aliases onto their canonical genre', () => {
    assert.strictEqual(normalizeGenre('和食店'), '和食');
    assert.strictEqual(normalizeGenre('中華料理店'), '中華');
    assert.strictEqual(normalizeGenre('アジア料理店'), 'アジア・エスニック料理');
    assert.strictEqual(normalizeGenre('カフェ・喫茶'), 'カフェ・スイーツ');
    assert.strictEqual(normalizeGenre('イタリア料理店'), 'イタリアン・フレンチ');
    assert.strictEqual(normalizeGenre('ビストロ'), 'イタリアン・フレンチ');
    assert.strictEqual(normalizeGenre('ダイニングバー・バル'), 'イタリアン・フレンチ');
    assert.strictEqual(normalizeGenre('パブ'), 'バー・カクテル');
    assert.strictEqual(normalizeGenre('アイリッシュ パブ'), 'バー・カクテル');
    assert.strictEqual(normalizeGenre('レストラン'), '洋食');
  });

  it('leaves already-canonical or unknown genres unchanged', () => {
    assert.strictEqual(normalizeGenre('居酒屋'), '居酒屋');
    assert.strictEqual(normalizeGenre('未知のジャンル'), '未知のジャンル');
  });

  it('passes through empty/falsy values unchanged', () => {
    assert.strictEqual(normalizeGenre(''), '');
    assert.strictEqual(normalizeGenre(undefined), undefined);
  });
});
