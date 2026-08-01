import assert from 'node:assert';
import { describe, it } from 'node:test';
import { haversineMeters } from '../../listeners/lib/geo.js';

describe('lib/geo', () => {
  describe('haversineMeters', () => {
    it('returns ~0 for the same point', () => {
      assert.ok(haversineMeters(35.6895, 139.6917, 35.6895, 139.6917) < 1);
    });

    it('returns a plausible distance for two known points', () => {
      // Tokyo Station to Shibuya Station is roughly 6.5km.
      const distance = haversineMeters(35.681236, 139.767125, 35.658034, 139.701636);
      assert.ok(distance > 5000 && distance < 8000, `expected ~6.5km, got ${distance}`);
    });
  });
});
