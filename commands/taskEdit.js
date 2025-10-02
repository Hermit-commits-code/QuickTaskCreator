// /task-edit command handler

const { getEditTaskModal } = require("../blockKit/editTaskModal");

module.exports = function (app, db) {
  // /task-edit command now opens modal
  app.command("/task-edit", async ({ ack, body, client }) => {
    await ack();
    // Fetch open tasks assigned to user
    db.all(
      `SELECT * FROM tasks WHERE status = 'open' AND (assigned_user = ? OR assigned_user IS NULL)`,
      [body.user_id],
      async (err, rows) => {
        if (err || !rows.length) {
          await client.chat.postEphemeral({
            channel: body.channel_id,
            user: body.user_id,
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

  // Modal submission handler
  app.view("edit_task_modal_submit", async ({ ack, body, view, client }) => {
    await ack();
    const user = body.user.id;
    const values = view.state.values;
    const taskId = values.task_block.task_select.selected_option.value;
    const newDesc = values.desc_block.desc_input.value;
    const newDue = values.due_block.due_input.value;
    db.run(
      `UPDATE tasks SET description = ?, due_date = ? WHERE id = ?`,
      [newDesc, newDue, taskId],
      function (err) {
        if (err || this.changes === 0) {
          client.chat.postEphemeral({
            channel: body.view.private_metadata || body.channel.id,
            user,
            text: "❗ Failed to edit task. Task not found or database error.",
          });
        } else {
          client.chat.postEphemeral({
            channel: body.view.private_metadata || body.channel.id,
            user,
            text: `:pencil2: Task updated successfully.`,
          });
        }
      }
    );
  });
};
