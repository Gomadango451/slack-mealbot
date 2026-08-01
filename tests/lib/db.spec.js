import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createLunchDb } from '../../listeners/lib/db.js';

describe('lib/db', () => {
  it('records shown restaurants and returns them via getRecentlyShownIds', () => {
    const db = createLunchDb(':memory:');

    db.recordShown('C123', 'chain', [
      { id: 'r001', name: 'Sample A' },
      { id: 'r002', name: 'Sample B' },
    ]);

    const recent = db.getRecentlyShownIds('C123');

    assert.deepStrictEqual(new Set(recent), new Set(['r001', 'r002']));
  });

  it('scopes recently shown ids per channel', () => {
    const db = createLunchDb(':memory:');

    db.recordShown('C123', 'chain', [{ id: 'r001', name: 'Sample A' }]);
    db.recordShown('C456', 'chain', [{ id: 'r002', name: 'Sample B' }]);

    assert.deepStrictEqual(db.getRecentlyShownIds('C123'), ['r001']);
    assert.deepStrictEqual(db.getRecentlyShownIds('C456'), ['r002']);
  });

  it('respects the limit passed to getRecentlyShownIds', () => {
    const db = createLunchDb(':memory:');

    db.recordShown('C123', 'chain', [{ id: 'r001', name: 'A' }]);
    db.recordShown('C123', 'chain', [{ id: 'r002', name: 'B' }]);
    db.recordShown('C123', 'chain', [{ id: 'r003', name: 'C' }]);

    assert.strictEqual(db.getRecentlyShownIds('C123', 2).length, 2);
  });

  it('records feedback without throwing', () => {
    const db = createLunchDb(':memory:');

    assert.doesNotThrow(() => {
      db.recordFeedback('C123', 'r001', 'Sample A', 'good', 'U123');
    });
  });

  describe('settings', () => {
    it('returns null when no settings have been saved', () => {
      const db = createLunchDb(':memory:');

      assert.strictEqual(db.getSettings(), null);
    });

    it('saves and retrieves settings', () => {
      const db = createLunchDb(':memory:');

      db.saveSettings({ address: '東京都新宿区', lat: 35.6895, lng: 139.6917, rangeCode: '3', updatedBy: 'U123' });

      const settings = db.getSettings();
      assert.strictEqual(settings.address, '東京都新宿区');
      assert.strictEqual(settings.lat, 35.6895);
      assert.strictEqual(settings.lng, 139.6917);
      assert.strictEqual(settings.rangeCode, '3');
      assert.strictEqual(settings.updatedBy, 'U123');
    });

    it('overwrites the single settings row on a second save', () => {
      const db = createLunchDb(':memory:');

      db.saveSettings({ address: '東京都新宿区', lat: 35.6895, lng: 139.6917, rangeCode: '3', updatedBy: 'U123' });
      db.saveSettings({ address: '大阪府大阪市', lat: 34.6937, lng: 135.5023, rangeCode: '1', updatedBy: 'U456' });

      const settings = db.getSettings();
      assert.strictEqual(settings.address, '大阪府大阪市');
      assert.strictEqual(settings.rangeCode, '1');
      assert.strictEqual(settings.updatedBy, 'U456');
    });
  });
});
