const { getDeleteTaskModal } = require("../blockKit/deleteTaskModal");

// /task-delete command handler
const { logWorkspace, logUser } = require("../models/analyticsModel");
module.exports = function (app, db) {
  app.command(
    "/task-delete",
    async ({ command, ack, client, body, respond }) => {
      try {
        await ack();
        // Log analytics
        const workspace_id = body.team_id;
        logWorkspace(workspace_id, "Slack Workspace");
        logUser(body.user_id, workspace_id, "Slack User");
        const id = command.text.trim();
        if (!id) {
          respond({
            text: "\u2757 Usage: /task-delete <task id>",
            response_type: "ephemeral",
          });
          console.error("[ERROR] /task-delete: Missing task ID.");
          return;
        }
        db.get(
          "SELECT description FROM tasks WHERE id = ? AND workspace_id = ?",
          [id, workspace_id],
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
              view: getDeleteTaskModal(id, row.description),
            });
          }
        );
      } catch (error) {
        console.error("/task-delete error:", error);
        respond({
          text: ":x: Internal error. Please try again later.",
          response_type: "ephemeral",
        });
      }
    }
  );

  app.view("delete_task_modal_submit", async ({ ack, body, view, client }) => {
    await ack();
    // Log analytics
    const workspace_id = body.team.id;
    logUser(body.user.id, workspace_id, "Slack User");
    const taskId = view.private_metadata;
    const reason = view.state.values.reason_block.reason_input.value;
    db.run(
      "DELETE FROM tasks WHERE id = ? AND workspace_id = ?",
      [taskId, workspace_id],
      function (err) {
        const { logActivity } = require("../models/activityLogModel");
        logActivity(
          body.user.id,
          "delete_task",
          `Task ${taskId} deleted. Reason: ${reason || "N/A"}`
        );
        if (err || this.changes === 0) {
          client.chat.postMessage({
            channel: body.user.id,
            text: "\u2757 Failed to delete task. Task not found or database error.",
          });
        } else {
          client.chat.postMessage({
            channel: body.user.id,
            text: `:wastebasket: Task ${taskId} deleted. ${
              reason ? "Reason: " + reason : ""
            }`,
          });
        }
      }
    );
  });
};
