import { CATEGORIES } from './restaurants.js';

export const CATEGORY_ACTION_IDS = {
  [CATEGORIES.LUNCH]: 'lunch_pick_lunch',
  [CATEGORIES.DINNER]: 'lunch_pick_dinner',
};

export const FEEDBACK_ACTION_IDS = {
  went: 'lunch_feedback_went',
  good: 'lunch_feedback_good',
  meh: 'lunch_feedback_meh',
};

export const SHUFFLE_ACTION_ID = 'lunch_shuffle';
export const GENRE_SELECT_ACTION_ID = 'lunch_genre_select';
export const CHANGE_GENRE_ACTION_ID = 'lunch_change_genre';

export const buildCategoryPromptBlocks = () => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':rice: *ランチ、それともディナー？*',
    },
  },
  {
    type: 'actions',
    block_id: 'lunch_category_block',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: '🍽️ ランチ' },
        action_id: CATEGORY_ACTION_IDS[CATEGORIES.LUNCH],
        value: CATEGORIES.LUNCH,
        style: 'primary',
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: '🌙 ディナー' },
        action_id: CATEGORY_ACTION_IDS[CATEGORIES.DINNER],
        value: CATEGORIES.DINNER,
      },
    ],
  },
];

const CATEGORY_LABELS = {
  [CATEGORIES.LUNCH]: '🍽️ ランチ',
  [CATEGORIES.DINNER]: '🌙 ディナー',
};

// `genres` is the list of distinct genre names available for the category, most common
// first (see getAvailableGenres). A static_select fires block_actions as soon as an
// option is picked, so no separate submit button is needed.
export const buildGenrePromptBlocks = (category, genres) => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${CATEGORY_LABELS[category]} だね:thumbsup: ジャンルは？`,
    },
  },
  {
    type: 'actions',
    block_id: 'lunch_genre_block',
    elements: [
      {
        type: 'static_select',
        action_id: GENRE_SELECT_ACTION_ID,
        placeholder: { type: 'plain_text', text: 'ジャンルを選ぶ' },
        options: [
          { text: { type: 'plain_text', text: '🎲 おまかせ(ジャンル問わず)' }, value: `${category}|` },
          ...genres.map((genre) => ({
            text: { type: 'plain_text', text: genre },
            value: `${category}|${genre}`,
          })),
        ],
      },
    ],
  },
];

export const buildCandidatesBlocks = (category, candidates, genre = '') => {
  const categoryLabel = genre ? `${CATEGORY_LABELS[category]}・${genre}` : CATEGORY_LABELS[category];

  if (candidates.length === 0) {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${categoryLabel} のお店が \`data/restaurants.json\` に見つかりませんでした。データを追加してください。`,
        },
      },
    ];
  }

  const candidateBlocks = candidates.flatMap((restaurant) => {
    const lines = [`*${restaurant.name}* — ${restaurant.genre}`];
    if (restaurant.address) lines.push(`:round_pushpin: ${restaurant.address}`);
    if (restaurant.sourceUrl) lines.push(`<${restaurant.sourceUrl}|詳細を見る>`);

    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: lines.join('\n'),
        },
      },
      {
        type: 'actions',
        block_id: `lunch_feedback_block_${restaurant.id}`,
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ 行った' },
            action_id: FEEDBACK_ACTION_IDS.went,
            value: restaurant.id,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '👍 良かった' },
            action_id: FEEDBACK_ACTION_IDS.good,
            value: restaurant.id,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '😅 イマイチ' },
            action_id: FEEDBACK_ACTION_IDS.meh,
            value: restaurant.id,
          },
        ],
      },
    ];
  });

  const hasHotpepperOrigin = candidates.some((restaurant) => restaurant.id.startsWith('hp_'));
  const hasGooglePlacesOrigin = candidates.some((restaurant) => restaurant.id.startsWith('gp_'));

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${categoryLabel} の候補はこちら:point_down:`,
      },
    },
    { type: 'divider' },
    ...candidateBlocks,
    { type: 'divider' },
    {
      type: 'actions',
      block_id: 'lunch_shuffle_block',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '🔀 別の3件を見る' },
          action_id: SHUFFLE_ACTION_ID,
          value: `${category}|${genre}`,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '🔄 ジャンルを変える' },
          action_id: CHANGE_GENRE_ACTION_ID,
          value: category,
        },
      ],
    },
    ...(hasHotpepperOrigin
      ? [
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '<http://webservice.recruit.co.jp/|Powered by ホットペッパーグルメ Webサービス>',
              },
            ],
          },
        ]
      : []),
    ...(hasGooglePlacesOrigin
      ? [
          {
            type: 'context',
            elements: [{ type: 'mrkdwn', text: '<https://maps.google.com/|Google Maps>' }],
          },
        ]
      : []),
  ];
};
