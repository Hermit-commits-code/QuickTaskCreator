// services/digestService.js
const cron = require("node-cron");
const { db } = require("../models/taskModel");

function startDigestScheduler(app, digestChannelId) {
  cron.schedule("0 9 * * *", async () => {
    // Get open, completed (last 24h), and overdue tasks
    db.all(`SELECT * FROM tasks`, async (err, rows) => {
      if (err || !rows.length) return;
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const openTasks = rows.filter((t) => t.status === "open");
      const completedTasks = rows.filter(
        (t) => t.status === "completed" && new Date(t.due_date) >= yesterday
      );
      const overdueTasks = rows.filter(
        (t) => t.status === "open" && t.due_date && new Date(t.due_date) < now
      );

      const blocks = [
        {
          type: "header",
          text: { type: "plain_text", text: "Daily Task Digest" },
        },
      ];
      if (openTasks.length) {
        blocks.push({
          type: "section",
          text: { type: "mrkdwn", text: `*Open Tasks*` },
        });
        openTasks.forEach((task) => {
          let assigned = task.assigned_user
            ? ` (Assigned: <@${task.assigned_user}>)`
            : "";
          let due = task.due_date ? ` (Due: ${task.due_date})` : "";
          blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `• *${task.description}*${assigned}${due}`,
            },
          });
        });
      }
      if (completedTasks.length) {
        blocks.push({
          type: "section",
          text: { type: "mrkdwn", text: `*Completed Tasks (last 24h)*` },
        });
        completedTasks.forEach((task) => {
          let assigned = task.assigned_user
            ? ` (Assigned: <@${task.assigned_user}>)`
            : "";
          let due = task.due_date ? ` (Due: ${task.due_date})` : "";
          blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `• *${task.description}*${assigned}${due}`,
            },
          });
        });
      }
      if (overdueTasks.length) {
        blocks.push({
          type: "section",
          text: { type: "mrkdwn", text: `*Overdue Tasks*` },
        });
        overdueTasks.forEach((task) => {
          let assigned = task.assigned_user
            ? ` (Assigned: <@${task.assigned_user}>)`
            : "";
          let due = task.due_date ? ` (Due: ${task.due_date})` : "";
          blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `• *${task.description}*${assigned}${due}`,
            },
          });
        });
      }
      if (blocks.length === 1) {
        blocks.push({
          type: "section",
          text: { type: "plain_text", text: "No tasks to show." },
        });
      }
      await app.client.chat.postMessage({
        channel: digestChannelId,
        text: "Daily Task Digest",
        blocks,
      });
    });
  });
}

module.exports = { startDigestScheduler };
