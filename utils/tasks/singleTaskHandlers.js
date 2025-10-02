const { getCompleteTaskModal } = require("../../blockKit/completeTaskModal");
const { getEditTaskModal } = require("../../blockKit/editTaskModal");
const { getDeleteTaskModal } = require("../../blockKit/deleteTaskModal");

function registerSingleTaskHandlers(app, db) {
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
}

module.exports = { registerSingleTaskHandlers };
