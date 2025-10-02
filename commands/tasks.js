// /tasks command handler

const { getCompleteTaskModal } = require("../blockKit/completeTaskModal");
const { getEditTaskModal } = require("../blockKit/editTaskModal");
const { getDeleteTaskModal } = require("../blockKit/deleteTaskModal");

module.exports = function (app, db) {
  app.command("/tasks", async ({ ack, respond, client, body }) => {
    await ack();
    db.all(`SELECT * FROM tasks WHERE status = 'open'`, async (err, rows) => {
      if (err) {
        respond({
          text: "Error fetching tasks.",
          response_type: "ephemeral",
        });
        console.error("[ERROR] /tasks: Error fetching tasks.", err);
        return;
      }
      if (rows.length === 0) {
        respond({ text: "No open tasks.", response_type: "ephemeral" });
        return;
      }
      const blocks = rows.map((t) => {
        let assigned = t.assigned_user
          ? ` _(Assigned to: <@${t.assigned_user}> )_`
          : "";
        let due = t.due_date ? ` _(Due: ${t.due_date})_` : "";
        return {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${t.description}*${assigned}${due}`,
          },
          accessory: {
            type: "button",
            text: { type: "plain_text", text: "Complete" },
            action_id: `complete_task_${t.id}`,
            value: String(t.id),
          },
        };
      });
      // Add Edit and Delete buttons as actions
      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Edit" },
            action_id: "edit_task",
            value: "edit",
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Delete" },
            action_id: "delete_task",
            value: "delete",
          },
        ],
      });
      await client.chat.postMessage({
        channel: body.channel_id,
        blocks,
        text: "Open Tasks",
      });
    });
  });

  // Complete button handler
  app.action(/complete_task_\d+/, async ({ ack, body, client, action }) => {
    await ack();
    const taskId = action.value;
    db.get("SELECT * FROM tasks WHERE id = ?", [taskId], async (err, row) => {
      if (err || !row) {
        await client.chat.postEphemeral({
          channel: body.channel.id,
          user: body.user.id,
          text: "Task not found.",
        });
        return;
      }
      await client.views.open({
        trigger_id: body.trigger_id,
        view: getCompleteTaskModal([row]),
      });
    });
  });

  // Edit button handler
  app.action("edit_task", async ({ ack, body, client }) => {
    await ack();
    // Show modal with user's open tasks
    db.all(
      `SELECT * FROM tasks WHERE status = 'open' AND (assigned_user = ? OR assigned_user IS NULL)`,
      [body.user.id],
      async (err, rows) => {
        if (err || !rows.length) {
          await client.chat.postEphemeral({
            channel: body.channel.id,
            user: body.user.id,
            text: "No open tasks to edit.",
          });
          return;
        }
        await client.views.open({
          trigger_id: body.trigger_id,
          view: getEditTaskModal(rows),
        });
      }
    );
  });

  // Delete button handler
  app.action("delete_task", async ({ ack, body, client }) => {
    await ack();
    // Show modal with all open tasks (admin only logic can be added here)
    db.all(
      `SELECT * FROM tasks WHERE status = 'open'`,
      [],
      async (err, rows) => {
        if (err || !rows.length) {
          await client.chat.postEphemeral({
            channel: body.channel.id,
            user: body.user.id,
            text: "No open tasks to delete.",
          });
          return;
        }
        await client.views.open({
          trigger_id: body.trigger_id,
          view: getDeleteTaskModal(rows),
        });
      }
    );
  });
};
