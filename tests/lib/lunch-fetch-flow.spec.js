import assert from 'node:assert';
import { describe, it } from 'node:test';
import { buildFetchSummaryBlocks, createPendingFetchStore } from '../../listeners/lib/lunch-fetch-flow.js';

describe('lib/lunch-fetch-flow', () => {
  describe('createPendingFetchStore', () => {
    it('returns a saved entry once, then nothing on a second take', () => {
      const store = createPendingFetchStore();
      const restaurants = [{ id: 'hp_1', name: 'Sample' }];

      const token = store.save(restaurants, 'U123');
      const entry = store.take(token);

      assert.strictEqual(entry.restaurants, restaurants);
      assert.strictEqual(entry.requestedBy, 'U123');
      assert.strictEqual(store.take(token), undefined);
    });

    it('returns undefined for an unknown token', () => {
      const store = createPendingFetchStore();

      assert.strictEqual(store.take('does-not-exist'), undefined);
    });
  });

  describe('buildFetchSummaryBlocks', () => {
    it('includes the fetched/existing counts and three confirm buttons', () => {
      const blocks = buildFetchSummaryBlocks('tok123', {
        sourceLabel: 'Google Places API',
        fetchedCount: 50,
        existingCount: 20,
        lunchCount: 10,
        nonLunchCount: 40,
      });

      const actionsBlock = blocks.find((block) => block.type === 'actions');
      assert.strictEqual(actionsBlock.elements.length, 3);
      assert.ok(actionsBlock.elements.every((element) => element.value === 'tok123'));

      const summaryText = blocks[0].text.text;
      assert.ok(summaryText.includes('Google Places API'));
      assert.ok(summaryText.includes('50件'));
      assert.ok(summaryText.includes('20件'));
    });
  });
});
