// /report command handler for analytics
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
const { getTaskStats } = require('../models/reportModel');
function buildAnalyticsBlocks(stats, recentStats, completionRate) {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'QuickTaskCreator Task Report' },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Summary:*\n• Total Tasks: ${stats.total}\n• Completed: ${stats.completed}\n• Open: ${stats.open}\n• Overdue: ${stats.overdue}\n• Completion Rate: ${completionRate}%`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Recent Activity (last 7 days):*\n• Created: ${recentStats.created}\n• Completed: ${recentStats.completed}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*By Category:*\n${stats.byCategory
          .map((c) => `• ${c.category || 'Uncategorized'}: ${c.count}`)
          .join('\n')}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*By Priority:*\n${stats.byPriority
          .map((p) => `• ${p.priority || 'None'}: ${p.count}`)
          .join('\n')}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*By User:*\n${stats.byUser
          .map((u) => `• <@${u.assigned_user || 'Unassigned'}>: ${u.count}`)
          .join('\n')}`,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '_QuickTaskCreator © 2025 | All rights reserved._',
        },
      ],
    },
  ];
}

module.exports = function (app, db) {
  app.command('/report', async ({ ack, body, client, logger }) => {
    await ack();
    const workspace_id = body.team_id || body.team?.id;
    const channel_id = body.channel_id;
    const user_id = body.user_id;
    logger.info(
      `[report] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
    );
    getTokenForTeam(workspace_id, (err, botToken) => {
      if (err || !botToken) {
        logger.error(
          `[report] No bot token found for workspace: ${workspace_id}`,
          err,
        );
        client.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: ':x: App not properly installed for this workspace. Please reinstall.',
        });
        return;
      }
      const realClient = new WebClient(botToken);
      getTaskStats(workspace_id, (err, stats) => {
        if (err) {
          logger.error(
            `[report] Error generating report for workspace: ${workspace_id}`,
            err,
          );
          realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: ':x: Error generating report.',
          });
          return;
        }
        const completionRate =
          stats.total > 0
            ? ((stats.completed / stats.total) * 100).toFixed(1)
            : '0';
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        db.all(
          'SELECT status, COUNT(*) as count FROM tasks WHERE date(created_at) >= date(?) GROUP BY status',
          [sevenDaysAgo.toISOString().slice(0, 10)],
          async (err2, recentRows) => {
            let recentStats = { created: 0, completed: 0 };
            if (!err2 && recentRows) {
              recentRows.forEach((row) => {
                if (row.status === 'completed')
                  recentStats.completed = row.count;
                if (row.status === 'open') recentStats.created = row.count;
              });
            }
            const blocks = buildAnalyticsBlocks(
              stats,
              recentStats,
              completionRate,
            );
            try {
              await realClient.chat.postEphemeral({
                channel: channel_id,
                user: user_id,
                blocks,
                text: 'QuickTaskCreator Analytics',
              });
            } catch (apiErr) {
              logger.error(
                `[report] Slack API error for workspace: ${workspace_id}, channel: ${channel_id}, user: ${user_id}`,
                apiErr,
              );
              if (apiErr.data && apiErr.data.error === 'channel_not_found') {
                await realClient.chat.postEphemeral({
                  channel: channel_id,
                  user: user_id,
                  text: ':x: Channel not found or bot is not a member. Please invite the bot to this channel.',
                });
              } else if (
                apiErr.data &&
                apiErr.data.error === 'user_not_found'
              ) {
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
          },
        );
      });
    });
  });
};
