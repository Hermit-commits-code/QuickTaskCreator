// Block Kit builder for reminder messages
function getReminderBlocks(task) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:alarm_clock: *Task Reminder*\n- Task: ${task.description}\n- Due: ${task.due_date}\n- ID: ${task.id}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Snooze 1 hour" },
          value: String(task.id),
          action_id: "reminder_snooze_1h",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Snooze 1 day" },
          value: String(task.id),
          action_id: "reminder_snooze_1d",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Reschedule" },
          value: String(task.id),
          action_id: "reminder_reschedule",
        },
      ],
    },
  ];
}

module.exports = { getReminderBlocks };
