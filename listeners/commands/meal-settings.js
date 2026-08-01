import { lunchDb } from '../lib/db.js';
import { RANGE_OPTIONS } from '../lib/hotpepper.js';

const DEFAULT_RANGE_CODE = '3'; // 1000m

export const buildSettingsModalView = (currentSettings) => {
  const currentCode = currentSettings?.rangeCode ?? DEFAULT_RANGE_CODE;
  const initialRange = RANGE_OPTIONS.find((option) => option.code === currentCode) ?? RANGE_OPTIONS[2];

  return {
    type: 'modal',
    callback_id: 'meal_settings_view',
    title: { type: 'plain_text', text: '食事検索設定' },
    submit: { type: 'plain_text', text: '保存' },
    close: { type: 'plain_text', text: 'キャンセル' },
    blocks: [
      {
        type: 'input',
        block_id: 'meal_settings_address_block',
        label: { type: 'plain_text', text: '検索の中心地点(住所または地名)' },
        element: {
          type: 'plain_text_input',
          action_id: 'meal_settings_address_input',
          ...(currentSettings?.address && { initial_value: currentSettings.address }),
        },
      },
      {
        type: 'input',
        block_id: 'meal_settings_range_block',
        label: { type: 'plain_text', text: '検索半径' },
        element: {
          type: 'static_select',
          action_id: 'meal_settings_range_select',
          options: RANGE_OPTIONS.map((option) => ({
            text: { type: 'plain_text', text: option.label },
            value: option.code,
          })),
          initial_option: {
            text: { type: 'plain_text', text: initialRange.label },
            value: initialRange.code,
          },
        },
      },
    ],
  };
};

const mealSettingsCommandCallback = async ({ ack, body, client, logger, db = lunchDb }) => {
  try {
    await ack();

    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildSettingsModalView(db.getSettings()),
    });
  } catch (error) {
    logger.error(error);
  }
};

export { mealSettingsCommandCallback };
