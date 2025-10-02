const cron = require("node-cron");
const { db } = require("../models/taskModel");
const { getReminderBlocks } = require("../blockKit/reminderBlocks");

function startReminderScheduler(app) {
  cron.schedule("* * * * *", async () => {
    db.all(
      `SELECT * FROM tasks WHERE status = 'open' AND assigned_user IS NOT NULL AND due_date IS NOT NULL`,
      async (err, rows) => {
        if (err || !rows.length) return;
        const now = new Date();
        for (const task of rows) {
          const due = new Date(task.due_date);
          if (isNaN(due.getTime())) continue;
          const msDiff = due.getTime() - now.getTime();
          const hoursDiff = msDiff / (1000 * 60 * 60);
          let shouldRemind = false;
          let reminderType = "";
          if (
            task.reminder_status !== "sent_1d" &&
            hoursDiff <= 24 &&
            hoursDiff > 0
          ) {
            reminderType = "1d";
            shouldRemind = true;
          } else if (
            task.reminder_status !== "sent_due" &&
            hoursDiff <= 0 &&
            hoursDiff > -1
          ) {
            reminderType = "due";
            shouldRemind = true;
          }
          if (shouldRemind) {
            try {
              // Open DM channel with assigned user
              const dm = await app.client.conversations.open({
                users: task.assigned_user,
              });
              const dmChannel = dm.channel.id;
              await app.client.chat.postMessage({
                channel: dmChannel,
                text: `:alarm_clock: Reminder: Task "${
                  task.description
                }" is due ${reminderType === "1d" ? "in 24 hours" : "today"}.`,
                blocks: getReminderBlocks(task),
              });
              let newStatus = reminderType === "1d" ? "sent_1d" : "sent_due";
              let nextTime = null;
              db.run(
                `UPDATE tasks SET reminder_status = ?, next_reminder_time = ? WHERE id = ?`,
                [newStatus, nextTime, task.id]
              );
            } catch (e) {
              console.error("Error sending reminder for task", task.id, e);
            }
          }
        }
      }
    );
  });
}

module.exports = { startReminderScheduler };
