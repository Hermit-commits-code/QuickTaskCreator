// /setdigestchannel command handler
const { setSetting } = require('../models/settingsModel');

const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
module.exports = function (app) {
  app.command(
    '/setdigestchannel',
    async ({ ack, command, body, client, logger }) => {
      await ack();
      const workspace_id = body.team_id;
      const channel_id = body.channel_id;
      const user_id = body.user_id;
      if (logger) {
        logger.info(
          `[setdigestchannel] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
        );
      } else {
        console.log(
          '[setdigestchannel] workspace_id:',
          workspace_id,
          'channel_id:',
          channel_id,
          'user_id:',
          user_id,
        );
      }
      const digestChannelId = command.text.trim();
      if (!digestChannelId || !digestChannelId.startsWith('C')) {
        await client.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: ':warning: Please provide a valid Slack channel ID (e.g. C12345678).',
        });
        return;
      }
      try {
        const botToken = await getTokenForTeam(workspace_id);
        if (!botToken) {
          if (logger)
            logger.error(
              '[setdigestchannel] No bot token found for workspace:',
              workspace_id,
            );
          else
            console.error(
              '[setdigestchannel] No bot token found for workspace:',
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
        await setSetting('digest_channel', digestChannelId, workspace_id);
        await realClient.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: `:white_check_mark: Digest channel set to <#${digestChannelId}>!`,
        });
      } catch (err) {
        if (logger)
          logger.error('[setdigestchannel] Error setting digest channel:', err);
        else
          console.error(
            '[setdigestchannel] Error setting digest channel:',
            err,
          );
        await client.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: ':x: Failed to set digest channel. Please try again.',
        });
      }
    },
  );
};
