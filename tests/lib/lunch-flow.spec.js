import assert from 'node:assert';
import { describe, it } from 'node:test';
import { buildCandidatesBlocks, buildGenrePromptBlocks } from '../../listeners/lib/lunch-flow.js';
import { CATEGORIES } from '../../listeners/lib/restaurants.js';

describe('lib/lunch-flow', () => {
  describe('buildGenrePromptBlocks', () => {
    it('puts おまかせ first, followed by each genre, all carrying the category', () => {
      const blocks = buildGenrePromptBlocks(CATEGORIES.LUNCH, ['イタリアン', '和食']);

      const select = blocks.flatMap((block) => block.elements ?? []).find((el) => el.type === 'static_select');
      assert.strictEqual(select.options.length, 3);
      assert.ok(select.options[0].text.text.includes('おまかせ'));
      assert.strictEqual(select.options[0].value, 'lunch|');
      assert.strictEqual(select.options[1].value, 'lunch|イタリアン');
      assert.strictEqual(select.options[2].value, 'lunch|和食');
    });
  });

  describe('buildCandidatesBlocks', () => {
    it('includes the selected genre in the heading and the shuffle button value', () => {
      const candidates = [{ id: 'r001', name: 'サイゼリヤ', genre: 'イタリアン' }];

      const blocks = buildCandidatesBlocks(CATEGORIES.LUNCH, candidates, 'イタリアン');

      const heading = blocks[0].text.text;
      assert.ok(heading.includes('イタリアン'));

      const shuffleButton = blocks
        .flatMap((block) => block.elements ?? [])
        .find((el) => el.action_id === 'lunch_shuffle');
      assert.strictEqual(shuffleButton.value, 'lunch|イタリアン');

      const changeGenreButton = blocks
        .flatMap((block) => block.elements ?? [])
        .find((el) => el.action_id === 'lunch_change_genre');
      assert.strictEqual(changeGenreButton.value, 'lunch');
    });

    it('renders name/genre only, and no credit block, for manually-registered restaurants', () => {
      const candidates = [{ id: 'r001', name: 'サイゼリヤ', genre: 'イタリアン' }];

      const blocks = buildCandidatesBlocks(CATEGORIES.LUNCH, candidates);

      const candidateSection = blocks.find(
        (block) => block.type === 'section' && block.text.text.includes('サイゼリヤ'),
      );
      assert.strictEqual(candidateSection.text.text, '*サイゼリヤ* — イタリアン');
      assert.ok(!blocks.some((block) => block.type === 'context'));
    });

    it('includes address/link and a credit context block for Hot Pepper-sourced restaurants', () => {
      const candidates = [
        {
          id: 'hp_1',
          name: 'サイゼリヤ 渋谷店',
          genre: 'イタリアン',
          address: '東京都渋谷区1-1-1',
          sourceUrl: 'https://example.com/hp_1',
        },
      ];

      const blocks = buildCandidatesBlocks(CATEGORIES.LUNCH, candidates);

      const candidateSection = blocks.find(
        (block) => block.type === 'section' && block.text.text.includes('サイゼリヤ 渋谷店'),
      );
      assert.ok(candidateSection.text.text.includes('東京都渋谷区1-1-1'));
      assert.ok(candidateSection.text.text.includes('https://example.com/hp_1'));

      const creditBlock = blocks.find((block) => block.type === 'context');
      assert.ok(creditBlock.elements[0].text.includes('Powered by ホットペッパーグルメ Webサービス'));
      assert.ok(creditBlock.elements[0].text.includes('webservice.recruit.co.jp'));
    });

    it('omits the credit block when none of the candidates are Hot Pepper-sourced', () => {
      const candidates = [
        { id: 'r001', name: 'A店', genre: '定食' },
        { id: 'r002', name: 'B店', genre: 'カフェ' },
      ];

      const blocks = buildCandidatesBlocks(CATEGORIES.DINNER, candidates);

      assert.ok(!blocks.some((block) => block.type === 'context'));
    });

    it('shows the credit block when at least one of several candidates is Hot Pepper-sourced', () => {
      const candidates = [
        { id: 'r001', name: 'A店', genre: '定食' },
        { id: 'hp_1', name: 'B店', genre: 'カフェ', sourceUrl: 'https://example.com/hp_1' },
      ];

      const blocks = buildCandidatesBlocks(CATEGORIES.DINNER, candidates);

      assert.ok(blocks.some((block) => block.type === 'context'));
    });

    it('shows the Google Maps credit (not Hot Pepper) for Google Places-sourced restaurants', () => {
      const candidates = [
        {
          id: 'gp_1',
          name: 'サイゼリヤ 渋谷店',
          genre: 'restaurant',
          sourceUrl: 'https://maps.google.com/?cid=123',
        },
      ];

      const blocks = buildCandidatesBlocks(CATEGORIES.DINNER, candidates);

      const contextBlocks = blocks.filter((block) => block.type === 'context');
      assert.strictEqual(contextBlocks.length, 1);
      assert.ok(contextBlocks[0].elements[0].text.includes('Google Maps'));
      assert.ok(!contextBlocks[0].elements[0].text.includes('ホットペッパー'));
    });

    it('shows both credit blocks when both Hot Pepper- and Google Places-sourced candidates are present', () => {
      const candidates = [
        { id: 'hp_1', name: 'A店', genre: '定食', sourceUrl: 'https://example.com/hp_1' },
        { id: 'gp_1', name: 'B店', genre: 'restaurant', sourceUrl: 'https://maps.google.com/?cid=123' },
      ];

      const blocks = buildCandidatesBlocks(CATEGORIES.DINNER, candidates);

      const contextBlocks = blocks.filter((block) => block.type === 'context');
      assert.strictEqual(contextBlocks.length, 2);
    });
  });
});
