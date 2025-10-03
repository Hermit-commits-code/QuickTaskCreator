const { getCompleteTaskModal } = require("../blockKit/completeTaskModal");

// /task-complete command handler
const { logWorkspace, logUser } = require("../models/analyticsModel");
module.exports = function (app, db) {
  app.command(
    "/task-complete",
    async ({ command, ack, client, body, respond }) => {
      await ack();
      // Log analytics
      logWorkspace(body.team_id, "Slack Workspace");
      logUser(body.user_id, body.team_id, "Slack User");
      const id = command.text.trim();
      if (!id) {
        respond({
          text: "\u2757 Usage: /task-complete <task id>",
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
              text: "\u2757 Task not found.",
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
      // Log analytics
      logUser(body.user.id, body.team.id, "Slack User");
      const taskId = view.private_metadata;
      const notes = view.state.values.notes_block.notes_input.value;
      db.run(
        'UPDATE tasks SET status = "complete" WHERE id = ?',
        [taskId],
        function (err) {
          const { logActivity } = require("../models/activityLogModel");
          logActivity(
            body.user.id,
            "complete_task",
            `Task ${taskId} marked complete. Notes: ${notes || "N/A"}`
          );
          if (err || this.changes === 0) {
            client.chat.postMessage({
              channel: body.user.id,
              text: "\u2757 Failed to complete task. Task not found or database error.",
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
