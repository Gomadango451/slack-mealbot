import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { geocodeAddress } from '../../listeners/lib/geocode.js';

describe('lib/geocode', () => {
  it('returns parsed lat/lng from the first result', async () => {
    const fetchImpl = mock.fn(async () => ({
      ok: true,
      json: async () => [{ lat: '35.6895', lon: '139.6917' }],
    }));

    const result = await geocodeAddress('東京都新宿区', { fetchImpl });

    assert.deepStrictEqual(result, { lat: 35.6895, lng: 139.6917 });
    assert.strictEqual(fetchImpl.mock.callCount(), 1);

    const [url, options] = fetchImpl.mock.calls[0].arguments;
    assert.ok(String(url).includes('nominatim.openstreetmap.org'));
    assert.ok(options.headers['User-Agent']);
  });

  it('throws a descriptive error when there are no results', async () => {
    const fetchImpl = mock.fn(async () => ({ ok: true, json: async () => [] }));

    await assert.rejects(() => geocodeAddress('存在しない場所xyz', { fetchImpl }), /見つかりませんでした/);
  });

  it('throws a descriptive error on HTTP failure', async () => {
    const fetchImpl = mock.fn(async () => ({ ok: false, status: 503 }));

    await assert.rejects(() => geocodeAddress('東京', { fetchImpl }), /HTTP 503/);
  });
});
