// services/digestService.js
const cron = require("node-cron");
const { db } = require("../models/taskModel");

function startDigestScheduler(app, digestChannelId) {
  cron.schedule("0 9 * * *", async () => {
    db.all(`SELECT * FROM tasks WHERE status = 'open'`, async (err, rows) => {
      if (err || !rows.length) return;
      const blocks = [
        {
          type: "header",
          text: { type: "plain_text", text: "Daily Task Digest" },
        },
      ];
      rows.forEach((task) => {
        let assigned = task.assigned_user
          ? ` (Assigned: <@${task.assigned_user}>)`
          : "";
        let due = task.due_date ? ` (Due: ${task.due_date})` : "";
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${task.description}*${assigned}${due}`,
          },
        });
      });
      await app.client.chat.postMessage({
        channel: digestChannelId,
        text: "Daily Task Digest",
        blocks,
      });
    });
  });
}

module.exports = { startDigestScheduler };
