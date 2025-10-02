const { getCompleteTaskModal } = require("../blockKit/completeTaskModal");

// /task-complete command handler
module.exports = function (app, db) {
  app.command(
    "/task-complete",
    async ({ command, ack, client, body, respond }) => {
      await ack();
      const id = command.text.trim();
      if (!id) {
        respond({
          text: "❗ Usage: /task-complete <task id>",
          response_type: "ephemeral",
        });
        console.error("[ERROR] /task-complete: Missing task ID.");
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
            view: getCompleteTaskModal(id, row.description),
          });
        }
      );
    }
  );

  app.view(
    "complete_task_modal_submit",
    async ({ ack, body, view, client }) => {
      await ack();
      const taskId = view.private_metadata;
      const notes = view.state.values.notes_block.notes_input.value;
      db.run(
        'UPDATE tasks SET status = "complete" WHERE id = ?',
        [taskId],
        function (err) {
          if (err || this.changes === 0) {
            client.chat.postMessage({
              channel: body.user.id,
              text: "❗ Failed to complete task. Task not found or database error.",
            });
          } else {
            client.chat.postMessage({
              channel: body.user.id,
              text: `:white_check_mark: Task ${taskId} marked complete. ${
                notes ? "Notes: " + notes : ""
              }`,
            });
          }
        }
      );
    }
  );
};
