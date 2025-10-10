// /setdigestchannel command handler
const { setSetting } = require('../models/settingsModel');

const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
module.exports = function (app, db) {
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
      getTokenForTeam(workspace_id, async (err, botToken) => {
        if (err || !botToken) {
          if (logger)
            logger.error(
              '[setdigestchannel] No bot token found for workspace:',
              workspace_id,
              err,
            );
          else
            console.error(
              '[setdigestchannel] No bot token found for workspace:',
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
        setSetting(
          'digest_channel',
          digestChannelId,
          workspace_id,
          async (err) => {
            if (err) {
              await realClient.chat.postEphemeral({
                channel: channel_id,
                user: user_id,
                text: ':x: Failed to set digest channel. Please try again.',
              });
            } else {
              await realClient.chat.postEphemeral({
                channel: channel_id,
                user: user_id,
                text: `:white_check_mark: Digest channel set to <#${digestChannelId}>!`,
              });
            }
          },
        );
      });
    },
  );
};
