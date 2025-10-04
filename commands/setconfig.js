// /setconfig command handler for notification channel and schedule settings
module.exports = function (app, db) {
  const { setSetting, getSetting } = require("../models/settingsModel");
  app.command("/setconfig", async ({ ack, body, client }) => {
    await ack();
    const workspace_id = body.team_id;
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        callback_id: "setconfig_modal_submit",
        title: { type: "plain_text", text: "Workspace Settings" },
        submit: { type: "plain_text", text: "Save" },
        close: { type: "plain_text", text: "Cancel" },
        blocks: [
          {
            type: "input",
            block_id: "digest_channel_block",
            element: {
              type: "plain_text_input",
              action_id: "digest_channel_input",
              placeholder: {
                type: "plain_text",
                text: "Channel ID for daily digest",
              },
            },
            label: { type: "plain_text", text: "Digest Channel ID" },
          },
          {
            type: "input",
            block_id: "digest_time_block",
            element: {
              type: "plain_text_input",
              action_id: "digest_time_input",
              placeholder: {
                type: "plain_text",
                text: "Cron format (e.g. 0 9 * * *)",
              },
            },
            label: { type: "plain_text", text: "Digest Time (cron)" },
          },
          {
            type: "input",
            block_id: "reminder_time_block",
            element: {
              type: "plain_text_input",
              action_id: "reminder_time_input",
              placeholder: {
                type: "plain_text",
                text: "Cron format (e.g. 0 8 * * *)",
              },
            },
            label: { type: "plain_text", text: "Reminder Time (cron)" },
          },
        ],
      },
    });
  });

  app.view("setconfig_modal_submit", async ({ ack, body, view, client }) => {
    await ack();
    const digestChannel =
      view.state.values.digest_channel_block.digest_channel_input.value;
    const digestTime =
      view.state.values.digest_time_block.digest_time_input.value;
    const reminderTime =
      view.state.values.reminder_time_block.reminder_time_input.value;
    setSetting("digest_channel", digestChannel);
    setSetting("digest_time", digestTime);
    setSetting("reminder_time", reminderTime);
    const { logActivity } = require("../models/activityLogModel");
    logActivity(
      body.user.id,
      "update_config",
      `Digest Channel: ${digestChannel}, Digest Time: ${digestTime}, Reminder Time: ${reminderTime}`
    );
    await client.chat.postMessage({
      channel: body.user.id,
      text: `:white_check_mark: Workspace settings updated!\nDigest Channel: ${digestChannel}\nDigest Time: ${digestTime}\nReminder Time: ${reminderTime}`,
    });
  });
};
