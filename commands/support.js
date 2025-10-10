// /support command handler
const { getFeedbackModal } = require('../blockKit/feedbackModal');
const { getBugReportModal } = require('../blockKit/bugReportModal');
const { insertFeedback } = require('../models/feedbackModel');
const { insertBugReport } = require('../models/bugReportModel');
const { createGithubIssue } = require('../services/githubService');

const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
module.exports = function (app) {
  app.command('/support', async ({ ack, body, client, logger }) => {
    await ack();
    const workspace_id = body.team_id;
    const channel_id = body.channel_id;
    const user_id = body.user_id;
    if (logger) {
      logger.info(
        `[support] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
      );
    } else {
      console.log(
        '[support] workspace_id:',
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
            '[support] No bot token found for workspace:',
            workspace_id,
            err,
          );
        else
          console.error(
            '[support] No bot token found for workspace:',
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
              text: { type: 'plain_text', text: 'Support & Feedback' },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Need help or want to share feedback?',
              },
            },
            { type: 'divider' },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '• *Report a Bug*: <https://github.com/Hermit-commits-code/QuickTaskCreator/issues|Open a GitHub Issue>\n• *Submit Feedback*: Send feedback to <mailto:hotcupofjoe2013@gmail.com|support@quicktaskcreator.com>.',
              },
            },
            { type: 'divider' },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: '*Privacy:* No personal or message content is stored. Expected response time: 1-2 business days.',
                },
              ],
            },
          ],
          text: 'Support & Feedback',
        });
      } catch (apiErr) {
        if (logger) logger.error('[support] Slack API error:', apiErr);
        else console.error('[support] Slack API error:', apiErr);
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

  // Feedback modal trigger
  // All modal logic removed; only /support command remains
};
