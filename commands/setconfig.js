// /setconfig command handler for notification channel and schedule settings
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
module.exports = function (app) {
  const { setSetting, getSetting } = require('../models/settingsModel');
  app.command('/setconfig', async ({ ack, body, client, logger }) => {
    await ack();
    const workspace_id = body.team_id;
    const channel_id = body.channel_id;
    const user_id = body.user_id;
    if (logger) {
      logger.info(
        `[setconfig] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
      );
    } else {
      console.log(
        '[setconfig] workspace_id:',
        workspace_id,
        'channel_id:',
        channel_id,
        'user_id:',
        user_id,
      );
    }
    try {
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        if (logger)
          logger.error(
            '[setconfig] No bot token found for workspace:',
            workspace_id,
          );
        else
          console.error(
            '[setconfig] No bot token found for workspace:',
            workspace_id,
          );
        await client.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: ':x: App not properly installed for this workspace. Please reinstall.',
        });
        return;
      }
      const realClient = new WebClient(botToken);
      try {
        await realClient.views.open({
          trigger_id: body.trigger_id,
          view: {
            type: 'modal',
            callback_id: 'setconfig_modal_submit',
            title: { type: 'plain_text', text: 'Workspace Settings' },
            submit: { type: 'plain_text', text: 'Save' },
            close: { type: 'plain_text', text: 'Cancel' },
            blocks: [
              {
                type: 'input',
                block_id: 'digest_channel_block',
                element: {
                  type: 'plain_text_input',
                  action_id: 'digest_channel_input',
                  placeholder: {
                    type: 'plain_text',
                    text: 'Channel ID for daily digest',
                  },
                },
                label: { type: 'plain_text', text: 'Digest Channel ID' },
              },
              {
                type: 'input',
                block_id: 'digest_time_block',
                element: {
                  type: 'plain_text_input',
                  action_id: 'digest_time_input',
                  placeholder: {
                    type: 'plain_text',
                    text: 'Cron format (e.g. 0 9 * * *)',
                  },
                },
                label: { type: 'plain_text', text: 'Digest Time (cron)' },
              },
              {
                type: 'input',
                block_id: 'reminder_time_block',
                element: {
                  type: 'plain_text_input',
                  action_id: 'reminder_time_input',
                  placeholder: {
                    type: 'plain_text',
                    text: 'Cron format (e.g. 0 8 * * *)',
                  },
                },
                label: { type: 'plain_text', text: 'Reminder Time (cron)' },
              },
            ],
          },
        });
      } catch (apiErr) {
        if (logger)
          logger.error('[setconfig] Slack API error (modal open):', apiErr);
        else console.error('[setconfig] Slack API error (modal open):', apiErr);
        if (apiErr.data && apiErr.data.error === 'channel_not_found') {
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: ':x: Channel not found or bot is not a member. Please invite the bot to this channel.',
          });
        } else if (apiErr.data && apiErr.data.error === 'user_not_found') {
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: ':x: User not found. Please check the user ID.',
          });
        } else {
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: ':x: An unexpected error occurred. Please contact support.',
          });
        }
      }
    } catch (err) {
      if (logger) logger.error('[setconfig] Error getting bot token:', err);
      else console.error('[setconfig] Error getting bot token:', err);
      await client.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        text: ':x: App not properly installed for this workspace. Please reinstall.',
      });
    }
  });

  app.view('setconfig_modal_submit', async ({ ack, body, view, client }) => {
    await ack();
    const workspace_id = body.team.id || body.team_id;
    const digestChannel =
      view.state.values.digest_channel_block.digest_channel_input.value;
    const digestTime =
      view.state.values.digest_time_block.digest_time_input.value;
    const reminderTime =
      view.state.values.reminder_time_block.reminder_time_input.value;
    await setSetting('digest_channel', digestChannel, workspace_id);
    await setSetting('digest_time', digestTime, workspace_id);
    await setSetting('reminder_time', reminderTime, workspace_id);
    const { logActivity } = require('../models/activityLogModel');
    await logActivity(
      body.user.id,
      'update_config',
      `Digest Channel: ${digestChannel}, Digest Time: ${digestTime}, Reminder Time: ${reminderTime}`,
    );
    await client.chat.postMessage({
      channel: body.user.id,
      text: `:white_check_mark: Workspace settings updated!\nDigest Channel: ${digestChannel}\nDigest Time: ${digestTime}\nReminder Time: ${reminderTime}`,
    });
  });
};
