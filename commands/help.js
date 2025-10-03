// /help command handler
module.exports = function (app) {
  app.command("/help", async ({ ack, body, client }) => {
    await ack();
    await client.chat.postEphemeral({
      channel: body.channel_id,
      user: body.user_id,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "Quick Task Creator Help" },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Create, assign, and manage tasks directly in Slack. Fast, reliable, and frictionless.",
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Commands:*\n• `/task` – Create a new task\n• `/tasks` – List open tasks\n• `/task-edit` – Edit a task\n• `/task-complete` – Complete a task\n• `/task-delete` – Delete a task\n• `/add-admin` – Add admin\n• `/removeadmin` – Remove admin\n• `/setdigestchannel` – Set digest channel\n• `/setconfig` – Configure workspace\n• `/report` – View analytics\n• `/listadmins` – List admins\n• `/notifyprefs` – Notification preferences\n• `/help` – Show help\n• `/support` – Contact support",
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Contact Support" },
              value: "support",
              action_id: "open_support",
            },
          ],
        },
        { type: "divider" },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "See documentation or GitHub Issues for more help.",
            },
          ],
        },
      ],
      text: "Quick Task Creator Help",
    });
  });
};
