// Reminder button action handlers
module.exports = function (app, db) {
  // Snooze 1 hour
  app.action("reminder_snooze_1h", async ({ ack, body, client }) => {
    await ack();
    const taskId = body.actions[0].value;
    // Set next_reminder_time to 1 hour from now
    const nextTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.run(
      `UPDATE tasks SET next_reminder_time = ?, reminder_status = 'pending' WHERE id = ?`,
      [nextTime, taskId]
    );
    await client.chat.postMessage({
      channel: body.user.id,
      text: `:zzz: Task reminder snoozed for 1 hour.`,
    });
  });

  // Snooze 1 day
  app.action("reminder_snooze_1d", async ({ ack, body, client }) => {
    await ack();
    const taskId = body.actions[0].value;
    const nextTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.run(
      `UPDATE tasks SET next_reminder_time = ?, reminder_status = 'pending' WHERE id = ?`,
      [nextTime, taskId]
    );
    await client.chat.postMessage({
      channel: body.user.id,
      text: `:zzz: Task reminder snoozed for 1 day.`,
    });
  });

  // Reschedule (prompt user to use /task-edit)
  app.action("reminder_reschedule", async ({ ack, body, client }) => {
    await ack();
    const taskId = body.actions[0].value;
    await client.chat.postMessage({
      channel: body.user.id,
      text: `:calendar: To reschedule, use /task-edit ${taskId} <new due date>.`,
    });
  });
};
