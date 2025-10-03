// /report command handler for analytics
module.exports = function (app, db) {
  const { getTaskStats } = require("../models/reportModel");
  app.command("/report", async ({ ack, body, client }) => {
    await ack();
    getTaskStats((err, stats) => {
      if (err) {
        client.chat.postMessage({
          channel: body.channel_id,
          text: ":x: Error generating report.",
        });
        return;
      }
      // Calculate completion rate
      const completionRate =
        stats.total > 0
          ? ((stats.completed / stats.total) * 100).toFixed(1)
          : "0";
      // Recent activity (last 7 days)
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
          let blocks = [
            {
              type: "section",
              text: { type: "mrkdwn", text: `*Task Analytics Report*` },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Total Tasks:* ${stats.total}\n*Completed:* ${stats.completed}\n*Open:* ${stats.open}\n*Overdue:* ${stats.overdue}\n*Completion Rate:* ${completionRate}%`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Recent Activity (last 7 days):*\nCreated: ${recentStats.created}\nCompleted: ${recentStats.completed}`,
              },
            },
            {
              type: "divider",
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*By Category:*\n${stats.byCategory
                  .map((c) => `${c.category || "Uncategorized"}: ${c.count}`)
                  .join("\n")}`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*By Priority:*\n${stats.byPriority
                  .map((p) => `${p.priority || "None"}: ${p.count}`)
                  .join("\n")}`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*By User:*\n${stats.byUser
                  .map(
                    (u) => `<@${u.assigned_user || "Unassigned"}>: ${u.count}`
                  )
                  .join("\n")}`,
              },
            },
          ];
          client.chat.postMessage({
            channel: body.channel_id,
            blocks,
            text: "Task Analytics Report",
          });
        }
      );
    });
  });
};
