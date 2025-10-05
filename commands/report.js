// /report command handler for analytics
module.exports = function (app, db) {
  const { getTaskStats } = require("../models/reportModel");

  function buildAnalyticsBlocks(stats, recentStats, completionRate) {
    return [
      {
        type: "header",
        text: { type: "plain_text", text: "QuickTaskCreator Task Report" },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Summary:*
• Total Tasks: ${stats.total}
• Completed: ${stats.completed}
• Open: ${stats.open}
• Overdue: ${stats.overdue}
• Completion Rate: ${completionRate}%`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Recent Activity (last 7 days):*
• Created: ${recentStats.created}
• Completed: ${recentStats.completed}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*By Category:*
${stats.byCategory
  .map((c) => `• ${c.category || "Uncategorized"}: ${c.count}`)
  .join("\n")}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*By Priority:*
${stats.byPriority
  .map((p) => `• ${p.priority || "None"}: ${p.count}`)
  .join("\n")}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*By User:*
${stats.byUser
  .map((u) => `• <@${u.assigned_user || "Unassigned"}>: ${u.count}`)
  .join("\n")}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "_QuickTaskCreator © 2025 | All rights reserved._",
          },
        ],
      },
    ];
  }

  app.command("/report", async ({ ack, body, client }) => {
    await ack();
    const workspace_id = body.team_id || body.team?.id;
    getTaskStats(workspace_id, (err, stats) => {
      if (err) {
        client.chat.postEphemeral({
          channel: body.channel_id,
          user: body.user_id,
          text: ":x: Error generating report.",
        });
        return;
      }
      const completionRate =
        stats.total > 0
          ? ((stats.completed / stats.total) * 100).toFixed(1)
          : "0";
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      db.all(
        "SELECT status, COUNT(*) as count FROM tasks WHERE date(created_at) >= date(?) GROUP BY status",
        [sevenDaysAgo.toISOString().slice(0, 10)],
        (err2, recentRows) => {
          let recentStats = { created: 0, completed: 0 };
          if (!err2 && recentRows) {
            recentRows.forEach((row) => {
              if (row.status === "completed") recentStats.completed = row.count;
              if (row.status === "open") recentStats.created = row.count;
            });
          }
          // Use buildAnalyticsBlocks for UI construction only
          const blocks = buildAnalyticsBlocks(
            stats,
            recentStats,
            completionRate
          );
          client.chat.postEphemeral({
            channel: body.channel_id,
            user: body.user_id,
            blocks,
            text: "QuickTaskCreator Analytics",
          });
        }
      );
    });
  });
};
