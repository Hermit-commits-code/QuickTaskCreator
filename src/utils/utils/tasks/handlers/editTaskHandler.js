const { getEditTaskModal } = require('../../../blockKit/editTaskModal');
const taskModel = require('../../../models/taskModel');

module.exports = function registerEditTaskHandler(app) {
  app.action('edit_task', async ({ ack, body, client }) => {
    console.log('[DEBUG] edit_task action handler fired');
    let acked = false;
    const safeAck = async () => {
      if (!acked) {
        acked = true;
        await ack();
      }
    };
    await safeAck();
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
};
