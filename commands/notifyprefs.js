// commands/notifyprefs.js
const {
  setPreferences,
  getPreferences,
} = require('../models/notificationPreferencesModel');

const muteOptions = [
  {
    text: { type: 'plain_text', text: 'Mute all notifications' },
    value: 'mute_all',
  },
];
const digestOptions = [
  {
    text: {
      type: 'plain_text',
      text: 'Receive only digests (no reminders)',
    },
    value: 'digest_only',
  },
];

const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
module.exports = function (app) {
  app.command('/notifyprefs', async ({ ack, body, client, logger }) => {
    await ack();
    const userId = body.user_id;
    const workspace_id = body.team_id;
    const channel_id = body.channel_id;
    if (logger) {
      logger.info(
        `[notifyprefs] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${userId}`,
      );
    } else {
      console.log(
        '[notifyprefs] workspace_id:',
        workspace_id,
        'channel_id:',
        channel_id,
        'user_id:',
        userId,
      );
    }
    getTokenForTeam(workspace_id, async (err, botToken) => {
      if (err || !botToken) {
        if (logger)
          logger.error(
            '[notifyprefs] No bot token found for workspace:',
            workspace_id,
            err,
          );
        else
          console.error(
            '[notifyprefs] No bot token found for workspace:',
            workspace_id,
            err,
          );
        await client.chat.postEphemeral({
          channel: channel_id,
          user: userId,
          text: ':x: App not properly installed for this workspace. Please reinstall.',
        });
        return;
      }
      const realClient = new WebClient(botToken);
      getPreferences(userId, async (err, prefs) => {
        const muteBlock = {
          type: 'input',
          block_id: 'mute_block',
          element: {
            type: 'checkboxes',
            action_id: 'mute_input',
            options: muteOptions,
            ...(prefs && prefs.mute_all === 1
              ? { initial_options: [muteOptions[0]] }
              : {}),
          },
          label: { type: 'plain_text', text: 'Mute' },
        };
        const digestBlock = {
          type: 'input',
          block_id: 'digest_block',
          element: {
            type: 'checkboxes',
            action_id: 'digest_input',
            options: digestOptions,
            ...(prefs && prefs.digest_only === 1
              ? { initial_options: [digestOptions[0]] }
              : {}),
          },
          label: { type: 'plain_text', text: 'Digest Only' },
        };
        try {
          await realClient.views.open({
            trigger_id: body.trigger_id,
            view: {
              type: 'modal',
              callback_id: 'notifyprefs_modal_submit',
              private_metadata: JSON.stringify({ channel_id }),
              title: { type: 'plain_text', text: 'Notification Preferences' },
              submit: { type: 'plain_text', text: 'Save' },
              close: { type: 'plain_text', text: 'Cancel' },
              blocks: [
                muteBlock,
                digestBlock,
                {
                  type: 'input',
                  block_id: 'reminder_time_block',
                  element: {
                    type: 'plain_text_input',
                    action_id: 'reminder_time_input',
                    placeholder: {
                      type: 'plain_text',
                      text: 'e.g. 09:00, 17:30 (24h format)',
                    },
                    initial_value:
                      prefs && prefs.custom_reminder_time
                        ? prefs.custom_reminder_time
                        : '',
                  },
                  label: { type: 'plain_text', text: 'Custom Reminder Time' },
                  optional: true,
                },
              ],
            },
          });
        } catch (apiErr) {
          if (logger)
            logger.error('[notifyprefs] Slack API error (modal open):', apiErr);
          else
            console.error(
              '[notifyprefs] Slack API error (modal open):',
              apiErr,
            );
          if (apiErr.data && apiErr.data.error === 'channel_not_found') {
            await realClient.chat.postEphemeral({
              channel: channel_id,
              user: userId,
              text: ':x: Channel not found or bot is not a member. Please invite the bot to this channel.',
            });
          } else if (apiErr.data && apiErr.data.error === 'user_not_found') {
            await realClient.chat.postEphemeral({
              channel: channel_id,
              user: userId,
              text: ':x: User not found. Please check the user ID.',
            });
          } else {
            await realClient.chat.postEphemeral({
              channel: channel_id,
              user: userId,
              text: ':x: An unexpected error occurred. Please contact support.',
            });
          }
        }
      });
    });
  });

  app.view(
    'notifyprefs_modal_submit',
    async ({ ack, body, view, client, logger }) => {
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
          (opt) => opt.value === 'mute_all',
        );
      const digestOnly =
        view.state.values.digest_block.digest_input.selected_options.some(
          (opt) => opt.value === 'digest_only',
        );
      const customReminderTime =
        view.state.values.reminder_time_block.reminder_time_input.value;
      const workspace_id = body.team.id;
      getTokenForTeam(workspace_id, async (err, botToken) => {
        if (err || !botToken) {
          if (logger)
            logger.error(
              '[notifyprefs modal] No bot token found for workspace:',
              workspace_id,
              err,
            );
          else
            console.error(
              '[notifyprefs modal] No bot token found for workspace:',
              workspace_id,
              err,
            );
          if (channel_id && channel_id.startsWith('C')) {
            await client.chat.postEphemeral({
              channel: channel_id,
              user: userId,
              text: ':x: App not properly installed for this workspace. Please reinstall.',
            });
          }
          return;
        }
        const realClient = new WebClient(botToken);
        setPreferences(
          userId,
          { muteAll, digestOnly, customReminderTime },
          async () => {
            if (channel_id && channel_id.startsWith('C')) {
              try {
                await realClient.chat.postEphemeral({
                  channel: channel_id,
                  user: userId,
                  text: `:white_check_mark: Notification preferences updated!\
Mute all: ${muteAll ? 'Yes' : 'No'}\
Digest only: ${digestOnly ? 'Yes' : 'No'}\
Custom reminder time: ${customReminderTime || 'Default'}`,
                });
              } catch (apiErr) {
                if (logger)
                  logger.error('[notifyprefs modal] Slack API error:', apiErr);
                else
                  console.error('[notifyprefs modal] Slack API error:', apiErr);
              }
            } else {
              if (logger)
                logger.error(
                  '[ERROR] No valid channel_id for postEphemeral in /notifyprefs modal submission.',
                  channel_id,
                );
              else
                console.error(
                  '[ERROR] No valid channel_id for postEphemeral in /notifyprefs modal submission.',
                  channel_id,
                );
            }
          },
        );
      });
    },
  );
};
