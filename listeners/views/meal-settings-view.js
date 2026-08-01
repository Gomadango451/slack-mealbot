import { lunchDb } from '../lib/db.js';
import { geocodeAddress } from '../lib/geocode.js';
import { RANGE_OPTIONS } from '../lib/hotpepper.js';

const RANGE_LABELS = Object.fromEntries(RANGE_OPTIONS.map((option) => [option.code, option.label]));

// Geocoding is a network call, so we can't finish it within Slack's 3-second view_submission
// ack window. We ack immediately (closing the modal) and DM the result once it's done.
const mealSettingsViewCallback = async ({
  ack,
  view,
  body,
  client,
  logger,
  db = lunchDb,
  geocode = geocodeAddress,
}) => {
  await ack();

  const userId = body.user.id;
  const address = view.state.values.meal_settings_address_block.meal_settings_address_input.value?.trim();
  const rangeCode = view.state.values.meal_settings_range_block.meal_settings_range_select.selected_option.value;

  try {
    const { lat, lng } = await geocode(address);
    db.saveSettings({ address, lat, lng, rangeCode, updatedBy: userId });

    await client.chat.postMessage({
      channel: userId,
      text:
        ':white_check_mark: 検索設定を保存しました。\n' +
        `中心地点: ${address}\n` +
        `半径: ${RANGE_LABELS[rangeCode] ?? rangeCode}`,
    });
  } catch (error) {
    logger.error(error);
    await client.chat.postMessage({
      channel: userId,
      text: `:warning: 設定の保存に失敗しました: ${error.message}`,
    });
  }
};

export { mealSettingsViewCallback };
