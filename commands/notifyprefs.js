// commands/notifyprefs.js
const {
  setPreferences,
  getPreferences,
} = require("../models/notificationPreferencesModel");

const muteOptions = [
  {
    text: { type: "plain_text", text: "Mute all notifications" },
    value: "mute_all",
  },
];
const digestOptions = [
  {
    text: {
      type: "plain_text",
      text: "Receive only digests (no reminders)",
    },
    value: "digest_only",
  },
];

module.exports = function (app) {
  app.command("/notifyprefs", async ({ ack, body, client }) => {
    await ack();
    const userId = body.user_id;
    getPreferences(userId, async (err, prefs) => {
      console.log("[DEBUG] /notifyprefs prefs:", prefs);
      console.log("[DEBUG] mute_all:", prefs && prefs.mute_all);
      console.log("[DEBUG] digest_only:", prefs && prefs.digest_only);
      const muteBlock = {
        type: "input",
        block_id: "mute_block",
        element: {
          type: "checkboxes",
          action_id: "mute_input",
          options: muteOptions,
          ...(prefs && prefs.mute_all === 1
            ? { initial_options: [muteOptions[0]] }
            : {}),
        },
        label: { type: "plain_text", text: "Mute" },
      };
      const digestBlock = {
        type: "input",
        block_id: "digest_block",
        element: {
          type: "checkboxes",
          action_id: "digest_input",
          options: digestOptions,
          ...(prefs && prefs.digest_only === 1
            ? { initial_options: [digestOptions[0]] }
            : {}),
        },
        label: { type: "plain_text", text: "Digest Only" },
      };
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: "modal",
          callback_id: "notifyprefs_modal_submit",
          private_metadata: JSON.stringify({ channel_id: body.channel_id }),
          title: { type: "plain_text", text: "Notification Preferences" },
          submit: { type: "plain_text", text: "Save" },
          close: { type: "plain_text", text: "Cancel" },
          blocks: [
            muteBlock,
            digestBlock,
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
    let channel_id = null;
    try {
      if (view.private_metadata) {
        const meta = JSON.parse(view.private_metadata);
        if (meta.channel_id) channel_id = meta.channel_id;
      }
    } catch (e) {
      channel_id = view.private_metadata || null;
    }
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
      if (channel_id && channel_id.startsWith("C")) {
        client.chat.postEphemeral({
          channel: channel_id,
          user: userId,
          text: `:white_check_mark: Notification preferences updated!\
Mute all: ${muteAll ? "Yes" : "No"}\
Digest only: ${digestOnly ? "Yes" : "No"}\
Custom reminder time: ${customReminderTime || "Default"}`,
        });
      } else {
        console.error(
          "[ERROR] No valid channel_id for postEphemeral in /notifyprefs modal submission.",
          channel_id
        );
      }
    });
  });
};
