const { getCompleteTaskModal } = require("../blockKit/completeTaskModal");

// /task-complete command handler
const { logWorkspace, logUser } = require("../models/analyticsModel");
module.exports = function (app, db) {
  app.command("/task-complete", async ({ ack, client, body }) => {
    await ack();
    // Log analytics
    logWorkspace(body.team_id, "Slack Workspace");
    logUser(body.user_id, body.team_id, "Slack User");
    // Fetch all open tasks for the workspace
    db.all(
      "SELECT id, description, due_date FROM tasks WHERE status = 'open' AND workspace_id = ?",
      [body.team_id],
      async (err, rows) => {
        if (err || !rows || rows.length === 0) {
          await client.chat.postEphemeral({
            channel: body.channel_id,
            user: body.user_id,
            text: "No open tasks to complete.",
          });
          return;
        }
        await client.views.open({
          trigger_id: body.trigger_id,
          view: {
            ...getCompleteTaskModal(rows, { mode: "complete" }),
            private_metadata: JSON.stringify({ channel_id: body.channel_id }),
          },
        });
      }
    );
  });

  app.view(
    "complete_task_modal_submit",
    async ({ ack, body, view, client, respond }) => {
      await ack();
      // Log analytics
      logUser(body.user.id, body.team.id, "Slack User");
      // Support batch completion
      const selectedTaskIds = view.state.values.task_block.task_select
        .selected_options
        ? view.state.values.task_block.task_select.selected_options.map(
            (opt) => opt.value
          )
        : [view.state.values.task_block.task_select.selected_option.value];
      const notes = view.state.values.notes_block.notes_input.value;
      const { logActivity } = require("../models/activityLogModel");
      let completed = [];
      let failed = [];
      // Retrieve channel_id from private_metadata
      // Robustly parse channel_id from private_metadata
      let channel_id = null;
      try {
        if (view.private_metadata) {
          const meta = JSON.parse(view.private_metadata);
          if (meta.channel_id) channel_id = meta.channel_id;
        }
      } catch (e) {
        channel_id = view.private_metadata || null;
      }
      if (!channel_id || !channel_id.startsWith("C")) {
        // User ran command in DM or invalid context
        console.error(
          "[ERROR] Invalid channel_id for postEphemeral in /task-complete modal submission:",
          channel_id
        );
        return;
      }
      for (const taskId of selectedTaskIds) {
        db.run(
          'UPDATE tasks SET status = "complete" WHERE id = ?',
          [taskId],
          function (err) {
            logActivity(
              body.user.id,
              "complete_task",
              `Task ${taskId} marked complete. Notes: ${notes || "N/A"}`
            );
            if (err || this.changes === 0) {
              failed.push(taskId);
            } else {
              completed.push(taskId);
            }
            // After last task, send summary
            if (completed.length + failed.length === selectedTaskIds.length) {
              let msg = "";
              if (completed.length)
                msg += `:white_check_mark: Completed: ${completed.join(", ")}.`;
              if (failed.length)
                msg += `\n:warning: Failed: ${failed.join(", ")}.`;
              if (notes) msg += `\nNotes: ${notes}`;
              client.chat.postEphemeral({
                channel: channel_id,
                user: body.user.id,
                text: msg,
              });
            }
          }
        );
      }
    }
  );
};
