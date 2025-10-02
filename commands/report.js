// /report command handler for analytics
module.exports = function (app, db) {
  const { getTaskStats } = require("../models/reportModel");
  app.command("/report", async ({ ack, body, client }) => {
    await ack();
    getTaskStats((err, stats) => {
      if (err) {
        client.chat.postMessage({
          channel: body.user_id,
          text: ":x: Error generating report."
        });
        return;
      }
      let blocks = [
        {
          type: "section",
          text: { type: "mrkdwn", text: `*Task Analytics Report*` }
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*Total Tasks:* ${stats.total}\n*Completed:* ${stats.completed}\n*Open:* ${stats.open}\n*Overdue:* ${stats.overdue}` }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*By Category:*\n${stats.byCategory.map(c => `${c.category || 'Uncategorized'}: ${c.count}`).join("\n")}` }
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*By Priority:*\n${stats.byPriority.map(p => `${p.priority || 'None'}: ${p.count}`).join("\n")}` }
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*By User:*\n${stats.byUser.map(u => `<@${u.assigned_user || 'Unassigned'}>: ${u.count}`).join("\n")}` }
        }
      ];
      client.chat.postMessage({
        channel: body.user_id,
        blocks,
        text: "Task Analytics Report"
      });
    });
  });
};
