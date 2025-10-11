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

module.exports = function (app) {
  app.command('/report', async ({ ack, body, client, logger }) => {
    await ack();
    const workspace_id = body.team_id || body.team?.id;
    const channel_id = body.channel_id;
    const user_id = body.user_id;
    logger.info(
      `[report] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
    );
    try {
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        logger.error(
          `[report] No bot token found for workspace: ${workspace_id}`,
        );
        await client.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: ':x: App not properly installed for this workspace. Please reinstall.',
        });
        return;
      }
      const realClient = new WebClient(botToken);
      const stats = await getTaskStats(workspace_id);
      const completionRate =
        stats.total > 0
          ? ((stats.completed / stats.total) * 100).toFixed(1)
          : '0';
      // Get recent activity (last 7 days)
      const db = await require('../db')();
      const tasks = db.collection('tasks');
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentRows = await tasks
        .aggregate([
          {
            $match: {
              workspace_id,
              created_at: { $gte: sevenDaysAgo.toISOString() },
            },
          },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .toArray();
      let recentStats = { created: 0, completed: 0 };
      if (recentRows && recentRows.length > 0) {
        recentRows.forEach((row) => {
          if (row._id === 'completed') recentStats.completed = row.count;
          if (row._id === 'open') recentStats.created = row.count;
        });
      }
      const blocks = buildAnalyticsBlocks(stats, recentStats, completionRate);
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
      logger.error(
        `[report] Error generating report for workspace: ${workspace_id}`,
        err,
      );
      await client.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        text: ':x: Error generating report.',
      });
    }
  });
};
