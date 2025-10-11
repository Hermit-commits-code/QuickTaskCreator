const { getCompleteTaskModal } = require('../../blockKit/completeTaskModal');
const { getEditTaskModal } = require('../../blockKit/editTaskModal');
const { getDeleteTaskModal } = require('../../blockKit/deleteTaskModal');

const taskModel = require('../../models/taskModel');
function registerSingleTaskHandlers(app) {
  // Complete button handler
  app.action(/complete_task_\d+/, async ({ ack, body, client, action }) => {
    await ack();
    const taskId = action.value;
    try {
      const workspace_id = body.team.id;
      const dbTask = await taskModel.getOpenTasks(workspace_id);
      const row = dbTask.find((t) => t._id.toString() === taskId);
      if (!row) {
        await client.chat.postEphemeral({
          channel: body.channel.id,
          user: body.user.id,
          text: 'Task not found.',
        });
        return;
      }
      await client.views.open({
        trigger_id: body.trigger_id,
        view: getCompleteTaskModal([row]),
      });
    } catch (err) {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: body.user.id,
        text: 'Error fetching task.',
      });
    }
  });

  // Edit button handler
  app.action('edit_task', async ({ ack, body, client }) => {
    await ack();
    try {
      const workspace_id = body.team.id;
      const user_id = body.user.id;
      const dbTasks = await taskModel.getOpenTasks(workspace_id);
      const rows = dbTasks.filter(
        (t) => !t.assigned_user || t.assigned_user === user_id,
      );
      if (!rows.length) {
        await client.chat.postEphemeral({
          channel: body.channel.id,
          user: body.user.id,
          text: 'No open tasks to edit.',
        });
        return;
      }
      await client.views.open({
        trigger_id: body.trigger_id,
        view: getEditTaskModal(rows),
      });
    } catch (err) {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: body.user.id,
        text: 'Error fetching tasks.',
      });
    }
  });

  // Delete button handler
  app.action('delete_task', async ({ ack, body, client }) => {
    await ack();
    try {
      const workspace_id = body.team.id;
      const rows = await taskModel.getOpenTasks(workspace_id);
      if (!rows.length) {
        await client.chat.postEphemeral({
          channel: body.channel.id,
          user: body.user.id,
          text: 'No open tasks to delete.',
        });
        return;
      }
      await client.views.open({
        trigger_id: body.trigger_id,
        view: getDeleteTaskModal(rows),
      });
    } catch (err) {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: body.user.id,
        text: 'Error fetching tasks.',
      });
    }
  });
}

module.exports = { registerSingleTaskHandlers };
