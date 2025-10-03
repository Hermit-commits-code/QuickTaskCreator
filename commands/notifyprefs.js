// commands/notifyprefs.js
const {
  setPreferences,
  getPreferences,
} = require("../models/notificationPreferencesModel");

module.exports = function (app) {
  app.command("/notifyprefs", async ({ ack, body, client }) => {
    await ack();
    const userId = body.user_id;
    getPreferences(userId, async (err, prefs) => {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: "modal",
          callback_id: "notifyprefs_modal_submit",
          title: { type: "plain_text", text: "Notification Preferences" },
          submit: { type: "plain_text", text: "Save" },
          close: { type: "plain_text", text: "Cancel" },
          blocks: [
            {
              type: "input",
              block_id: "mute_block",
              element: {
                type: "checkboxes",
                action_id: "mute_input",
                options: [
                  {
                    text: {
                      type: "plain_text",
                      text: "Mute all notifications",
                    },
                    value: "mute_all",
                  },
                ],
                initial_options:
                  prefs && prefs.mute_all
                    ? [
                        {
                          text: {
                            type: "plain_text",
                            text: "Mute all notifications",
                          },
                          value: "mute_all",
                        },
                      ]
                    : [],
              },
              label: { type: "plain_text", text: "Mute" },
            },
            {
              type: "input",
              block_id: "digest_block",
              element: {
                type: "checkboxes",
                action_id: "digest_input",
                options: [
                  {
                    text: {
                      type: "plain_text",
                      text: "Receive only digests (no reminders)",
                    },
                    value: "digest_only",
                  },
                ],
                initial_options:
                  prefs && prefs.digest_only
                    ? [
                        {
                          text: {
                            type: "plain_text",
                            text: "Receive only digests (no reminders)",
                          },
                          value: "digest_only",
                        },
                      ]
                    : [],
              },
              label: { type: "plain_text", text: "Digest Only" },
            },
            {
              type: "input",
              block_id: "reminder_time_block",
              element: {
                type: "plain_text_input",
                action_id: "reminder_time_input",
                placeholder: {
                  type: "plain_text",
                  text: "e.g. 09:00, 17:30 (24h format)",
                },
                initial_value:
                  prefs && prefs.custom_reminder_time
                    ? prefs.custom_reminder_time
                    : "",
              },
              label: { type: "plain_text", text: "Custom Reminder Time" },
              optional: true,
            },
          ],
        },
      });
    });
  });

  app.view("notifyprefs_modal_submit", async ({ ack, body, view, client }) => {
    await ack();
    const userId = body.user.id;
    const muteAll =
      view.state.values.mute_block.mute_input.selected_options.some(
        (opt) => opt.value === "mute_all"
      );
    const digestOnly =
      view.state.values.digest_block.digest_input.selected_options.some(
        (opt) => opt.value === "digest_only"
      );
    const customReminderTime =
      view.state.values.reminder_time_block.reminder_time_input.value;
    setPreferences(userId, { muteAll, digestOnly, customReminderTime }, () => {
      client.chat.postMessage({
        channel: userId,
        text: `:white_check_mark: Notification preferences updated!\nMute all: ${
          muteAll ? "Yes" : "No"
        }\nDigest only: ${digestOnly ? "Yes" : "No"}\nCustom reminder time: ${
          customReminderTime || "Default"
        }`,
      });
    });
  });
};
