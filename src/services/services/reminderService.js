const cron = require('node-cron');
const connectDB = require('../db');
const { getReminderBlocks } = require('../blockKit/reminderBlocks');
const { ObjectId } = require('mongodb');

function startReminderScheduler(app) {
  cron.schedule('* * * * *', async () => {
    try {
      const db = await connectDB();
      const tasks = await db
        .collection('tasks')
        .find({
          status: 'open',
          assigned_user: { $ne: null },
          due_date: { $ne: null },
        })
        .toArray();
      if (!tasks.length) return;
      const now = new Date();
      for (const task of tasks) {
        const due = new Date(task.due_date);
        if (isNaN(due.getTime())) continue;
        const msDiff = due.getTime() - now.getTime();
        const hoursDiff = msDiff / (1000 * 60 * 60);
        let shouldRemind = false;
        let reminderType = '';
        if (
          task.reminder_status !== 'sent_1d' &&
          hoursDiff <= 24 &&
          hoursDiff > 0
        ) {
          reminderType = '1d';
          shouldRemind = true;
        } else if (
          task.reminder_status !== 'sent_due' &&
          hoursDiff <= 0 &&
          hoursDiff > -1
        ) {
          reminderType = 'due';
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
              }" is due ${reminderType === '1d' ? 'in 24 hours' : 'today'}.`,
              blocks: getReminderBlocks(task),
            });
            let newStatus = reminderType === '1d' ? 'sent_1d' : 'sent_due';
            let nextTime = null;
            await db
              .collection('tasks')
              .updateOne(
                { _id: new ObjectId(task._id) },
                {
                  $set: {
                    reminder_status: newStatus,
                    next_reminder_time: nextTime,
                  },
                },
              );
          } catch (e) {
            console.error('Error sending reminder for task', task._id, e);
          }
        }
      }
    } catch (err) {
      console.error('[reminderService] Error in reminder scheduler:', err);
    }
  });
}

module.exports = { startReminderScheduler };
