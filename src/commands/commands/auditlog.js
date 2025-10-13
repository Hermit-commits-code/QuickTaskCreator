// commands/auditlog.js
const { getRecentActivity } = require('../../models/models/activityLogModel');
const { isAdmin } = require('../../models/models/adminModel');
const { logWorkspace, logUser } = require('../../models/models/analyticsModel');
const { getTokenForTeam } = require('../../models/models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
module.exports = function (app) {
  app.command(
    '/auditlog',
    async ({ command, ack, respond, body, client, logger }) => {
      await ack();
      // Log analytics
      logWorkspace(body.team_id, 'Slack Workspace');
      logUser(body.user_id, body.team_id, 'Slack User');
      const workspace_id = body.team_id;
      const channel_id = body.channel_id;
      const user_id = body.user_id;
      if (logger) {
        logger.info(
          `[auditlog] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
        );
      } else {
        console.log(
          '[auditlog] workspace_id:',
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
              '[auditlog] No bot token found for workspace:',
              workspace_id,
              err,
            );
          else
            console.error(
              '[auditlog] No bot token found for workspace:',
              workspace_id,
              err,
            );
          await respond({
            text: ':x: App not properly installed for this workspace. Please reinstall.',
          });
          return;
        }
        // Not using realClient for respond, but for future-proofing and consistency
        const realClient = new WebClient(botToken);
        const userId = command.user_id;
        isAdmin(userId, async (err, isAdminUser) => {
          if (err || !isAdminUser) {
            await respond({
              text: 'You do not have permission to view the audit log.',
            });
            return;
          }
          getRecentActivity(20, (err, rows) => {
            if (err) {
              respond({ text: 'Error fetching activity log.' });
              return;
            }
            if (!rows.length) {
              respond({ text: 'No activity log entries found.' });
              return;
            }
            const blocks = rows.map((entry) => ({
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${entry.timestamp}* - <@${entry.user_id}>: *${entry.action}*\n${entry.details}`,
              },
            }));
            respond({ blocks });
          });
        });
      });
    },
  );
};
