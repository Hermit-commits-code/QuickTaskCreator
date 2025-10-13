const { getCompleteTaskModal } = require('../../../blockKit/completeTaskModal');
const taskModel = require('../../../models/taskModel');

module.exports = function registerCompleteTaskHandler(app) {
  app.action('complete_task', async ({ ack, body, client, action }) => {
    console.log('[DEBUG] complete_task action handler fired');
    let acked = false;
    const safeAck = async () => {
      if (!acked) {
        acked = true;
        await ack();
      }
    };
    await safeAck();
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
};
