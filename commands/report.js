// /report command handler for analytics
module.exports = function (app, db) {
  const { getTaskStats } = require("../models/reportModel");

  function buildAnalyticsBlocks(stats, recentStats, completionRate) {
    return [
      {
        type: "header",
        text: { type: "plain_text", text: "📊 QuickTaskCreator Analytics" },
      },
      {
        type: "context",
        elements: [
          {
            type: "image",
            image_url:
              "https://raw.githubusercontent.com/Hermit-commits-code/QuickTaskCreator/main/assets/logo.png",
            alt_text: "QuickTaskCreator Logo",
          },
          {
            type: "mrkdwn",
            text: "_Enterprise-ready analytics for your workspace. All data is private and secure._",
          },
        ],
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Total Tasks:*\n${stats.total} :clipboard:`,
          },
          {
            type: "mrkdwn",
            text: `*Completed:*\n${stats.completed} :white_check_mark:`,
          },
          {
            type: "mrkdwn",
            text: `*Open:*\n${stats.open} :hourglass_flowing_sand:`,
          },
          {
            type: "mrkdwn",
            text: `*Overdue:*\n${stats.overdue} :warning:`,
          },
          {
            type: "mrkdwn",
            text: `*Completion Rate:*\n${completionRate}% :chart_with_upwards_trend:`,
          },
        ],
        accessory: {
          type: "image",
          image_url: "https://img.icons8.com/color/48/000000/combo-chart.png",
          alt_text: "Analytics Chart",
        },
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Recent Activity (last 7 days)*\n• Created: *${recentStats.created}* :new: \n• Completed: *${recentStats.completed}* :tada:`,
        },
        accessory: {
          type: "image",
          image_url: "https://img.icons8.com/color/48/000000/calendar--v2.png",
          alt_text: "Calendar",
        },
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*By Category:*\n${stats.byCategory
            .map((c) => `• *${c.category || "Uncategorized"}*: ${c.count}`)
            .join("\n")}`,
        },
        accessory: {
          type: "image",
          image_url: "https://img.icons8.com/color/48/000000/tags.png",
          alt_text: "Category Tags",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*By Priority:*\n${stats.byPriority
            .map((p) => `• *${p.priority || "None"}*: ${p.count}`)
            .join("\n")}`,
        },
        accessory: {
          type: "image",
          image_url: "https://img.icons8.com/color/48/000000/high-priority.png",
          alt_text: "Priority",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*By User:*\n${stats.byUser
            .map((u) => `• <@${u.assigned_user || "Unassigned"}>: ${u.count}`)
            .join("\n")}`,
        },
        accessory: {
          type: "image",
          image_url:
            "https://img.icons8.com/color/48/000000/user-group-man-man.png",
          alt_text: "User Group",
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
