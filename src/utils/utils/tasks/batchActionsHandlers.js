const { getBatchTaskModal } = require("../../blockKit/batchTaskModal");
const { sendBatchResult } = require("./tasksUtils");

function registerBatchActions(app, db) {
  // Batch Actions button handler
  app.action("batch_task_actions", async ({ ack, body, client }) => {
    await ack();
    const userId = body.user.id;
    db.get(
      "SELECT * FROM admins WHERE user_id = ?",
      [userId],
      (err, adminRow) => {
        const isAdmin = !!adminRow;
        const query = isAdmin
          ? `SELECT * FROM tasks WHERE status = 'open'`
          : `SELECT * FROM tasks WHERE status = 'open' AND (assigned_user = ? OR assigned_user IS NULL)`;
        const params = isAdmin ? [] : [userId];
        db.all(query, params, async (err2, rows) => {
          if (err2 || !rows.length) {
            await client.chat.postEphemeral({
              channel: body.channel.id,
              user: userId,
              text: "No open tasks for batch actions.",
            });
            return;
          }
          await client.views.open({
            trigger_id: body.trigger_id,
            view: getBatchTaskModal(rows, isAdmin),
          });
        });
      }
    );
  });

  // Batch task modal submission handler
  app.view("batch_task_modal_submit", async ({ ack, body, view, client }) => {
    await ack();
    const userId = body.user.id;
    const selectedTasks =
      view.state.values.tasks_block.tasks_select.selected_options.map(
        (opt) => opt.value
      );
    const action =
      view.state.values.action_block.action_select.selected_option.value;
    db.get(
      "SELECT * FROM admins WHERE user_id = ?",
      [userId],
      (err, adminRow) => {
        const isAdmin = !!adminRow;
        let results = [];
        let processed = 0;
        selectedTasks.forEach((taskId) => {
          db.get(
            "SELECT * FROM tasks WHERE id = ?",
            [taskId],
            (err2, taskRow) => {
              const { logActivity } = require("../../models/activityLogModel");
              if (err2 || !taskRow) {
                results.push(`Task ${taskId}: Not found.`);
              } else if (action === "complete") {
                if (
                  isAdmin ||
                  taskRow.assigned_user === userId ||
                  !taskRow.assigned_user
                ) {
                  db.run(
                    "UPDATE tasks SET status = 'completed' WHERE id = ?",
                    [taskId],
                    (err3) => {
                      logActivity(
                        userId,
                        "batch_complete_task",
                        `Task ${taskId} marked complete via batch.`
                      );
                      if (err3) {
                        results.push(`Task ${taskId}: Error completing.`);
                      } else {
                        results.push(`Task ${taskId}: Completed.`);
                      }
                      processed++;
                      if (processed === selectedTasks.length)
                        sendBatchResult(client, body, results);
                    }
                  );
                } else {
                  results.push(`Task ${taskId}: Permission denied.`);
                  processed++;
                  if (processed === selectedTasks.length)
                    sendBatchResult(client, body, results);
                }
              } else if (action === "delete") {
                if (
                  isAdmin ||
                  taskRow.assigned_user === userId ||
                  !taskRow.assigned_user
                ) {
                  db.run("DELETE FROM tasks WHERE id = ?", [taskId], (err4) => {
                    logActivity(
                      userId,
                      "batch_delete_task",
                      `Task ${taskId} deleted via batch.`
                    );
                    if (err4) {
                      results.push(`Task ${taskId}: Error deleting.`);
                    } else {
                      results.push(`Task ${taskId}: Deleted.`);
                    }
                    processed++;
                    if (processed === selectedTasks.length)
                      sendBatchResult(client, body, results);
                  });
                } else {
                  results.push(`Task ${taskId}: Permission denied.`);
                  processed++;
                  if (processed === selectedTasks.length)
                    sendBatchResult(client, body, results);
                }
              }
            }
          );
        });
      }
    );
  });
}

module.exports = { registerBatchActions };
