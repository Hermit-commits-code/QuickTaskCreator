// /help command handler
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
module.exports = function (app) {
  app.command('/help', async ({ ack, body, client, logger }) => {
    await ack();
    const workspace_id = body.team_id;
    const channel_id = body.channel_id;
    const user_id = body.user_id;
    if (logger) {
      logger.info(
        `[help] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
      );
    } else {
      console.log(
        '[help] workspace_id:',
        workspace_id,
        'channel_id:',
        channel_id,
        'user_id:',
        user_id,
      );
    }
    getTokenForTeam(workspace_id, async (err, botToken) => {
      if (err || !botToken) {
        if (logger)
          logger.error(
            '[help] No bot token found for workspace:',
            workspace_id,
            err,
          );
        else
          console.error(
            '[help] No bot token found for workspace:',
            workspace_id,
            err,
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
        await realClient.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: 'Quick Task Creator Help' },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Create, assign, and manage tasks directly in Slack. Fast, reliable, and frictionless.',
              },
            },
            { type: 'divider' },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Commands:*\n• `/task` – Create a new task\n• `/tasks` – List open tasks\n• `/task-edit` – Edit a task\n• `/task-complete` – Complete a task\n• `/task-delete` – Delete a task\n• `/add-admin` – Add admin\n• `/removeadmin` – Remove admin\n• `/setdigestchannel` – Set digest channel\n• `/setconfig` – Configure workspace\n• `/report` – View analytics\n• `/listadmins` – List admins\n• `/notifyprefs` – Notification preferences\n• `/help` – Show help\n• `/support` – Contact support',
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'Contact Support' },
                  value: 'support',
                  action_id: 'open_support',
                },
              ],
            },
            { type: 'divider' },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: 'See documentation or GitHub Issues for more help.',
                },
              ],
            },
          ],
          text: 'Quick Task Creator Help',
        });
      } catch (apiErr) {
        if (logger) logger.error('[help] Slack API error:', apiErr);
        else console.error('[help] Slack API error:', apiErr);
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
    });
  });
};
