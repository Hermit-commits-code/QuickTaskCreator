const { getDeleteTaskModal } = require("../blockKit/deleteTaskModal");

// /task-delete command handler
module.exports = function (app, db) {
  app.command(
    "/task-delete",
    async ({ command, ack, client, body, respond }) => {
      await ack();
      const id = command.text.trim();
      if (!id) {
        respond({
          text: "❗ Usage: /task-delete <task id>",
          response_type: "ephemeral",
        });
        console.error("[ERROR] /task-delete: Missing task ID.");
        return;
      }
      db.get(
        "SELECT description FROM tasks WHERE id = ?",
        [id],
        async (err, row) => {
          if (err || !row) {
            respond({
              text: "❗ Task not found.",
              response_type: "ephemeral",
            });
            return;
          }
          await client.views.open({
            trigger_id: body.trigger_id,
            view: getDeleteTaskModal(id, row.description),
          });
        }
      );
    }
  );

  app.view("delete_task_modal_submit", async ({ ack, body, view, client }) => {
    await ack();
    const taskId = view.private_metadata;
    const reason = view.state.values.reason_block.reason_input.value;
    db.run("DELETE FROM tasks WHERE id = ?", [taskId], function (err) {
      const { logActivity } = require("../models/activityLogModel");
      logActivity(
        body.user.id,
        "delete_task",
        `Task ${taskId} deleted. Reason: ${reason || "N/A"}`
      );
      if (err || this.changes === 0) {
        client.chat.postMessage({
          channel: body.user.id,
          text: "❗ Failed to delete task. Task not found or database error.",
        });
      } else {
        client.chat.postMessage({
          channel: body.user.id,
          text: `:wastebasket: Task ${taskId} deleted. ${
            reason ? "Reason: " + reason : ""
          }`,
        });
      }
    });
  });
};
