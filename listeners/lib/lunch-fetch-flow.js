import { randomUUID } from 'node:crypto';

const ENTRY_TTL_MS = 15 * 60 * 1000;

export const FETCH_CONFIRM_ACTION_IDS = {
  overwrite: 'lunch_fetch_confirm_overwrite',
  merge: 'lunch_fetch_confirm_merge',
  cancel: 'lunch_fetch_cancel',
};

// Holds freshly fetched (but not yet saved) restaurant lists in memory, keyed by a
// short-lived token carried in the confirm/cancel button values. A Block Kit button's
// `value` is too small to hold ~200 restaurant records, so we keep the payload server-side.
export const createPendingFetchStore = () => {
  const entries = new Map();

  return {
    save(restaurants, requestedBy) {
      const token = randomUUID().slice(0, 8);
      entries.set(token, { restaurants, requestedBy, createdAt: Date.now() });
      return token;
    },

    take(token) {
      const entry = entries.get(token);
      entries.delete(token);
      if (!entry || Date.now() - entry.createdAt > ENTRY_TTL_MS) return undefined;
      return entry;
    },
  };
};

export const pendingFetchStore = createPendingFetchStore();

export const buildFetchSummaryBlocks = (
  token,
  { sourceLabel, fetchedCount, existingCount, lunchCount, nonLunchCount },
) => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text:
        `:mag: ${sourceLabel}から *${fetchedCount}件* 取得しました` +
        `(ランチ対応 ${lunchCount} / ランチなし ${nonLunchCount})。\n` +
        `現在の登録件数は *${existingCount}件* です。保存方法を選んでください。`,
    },
  },
  {
    type: 'actions',
    block_id: 'lunch_fetch_confirm_block',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: '⚠️ 上書き保存(既存データは失われます)' },
        style: 'danger',
        action_id: FETCH_CONFIRM_ACTION_IDS.overwrite,
        value: token,
        confirm: {
          title: { type: 'plain_text', text: '上書き保存の確認' },
          text: {
            type: 'mrkdwn',
            text: `既存の${existingCount}件を削除し、新しく取得した${fetchedCount}件で置き換えます。よろしいですか？`,
          },
          confirm: { type: 'plain_text', text: '上書きする' },
          deny: { type: 'plain_text', text: 'やめる' },
        },
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: '➕ マージして保存' },
        style: 'primary',
        action_id: FETCH_CONFIRM_ACTION_IDS.merge,
        value: token,
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: 'キャンセル' },
        action_id: FETCH_CONFIRM_ACTION_IDS.cancel,
        value: token,
      },
    ],
  },
];
