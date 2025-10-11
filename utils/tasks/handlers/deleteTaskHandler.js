const { getDeleteTaskModal } = require('../../../blockKit/deleteTaskModal');
// const taskModel = require('../../../models/taskModel');

module.exports = function registerDeleteTaskHandler(app) {
  app.action(
    (payload) => {
      return (
        payload &&
        payload.type === 'block_actions' &&
        payload.actions &&
        Array.isArray(payload.actions) &&
        payload.actions.some(
          (a) => a.action_id === 'delete_task' && a.type === 'button',
        )
      );
    },
    async ({ ack, body, client, payload }) => {
      console.log('[DEBUG] delete_task action handler fired');
      console.log(
        '[DEBUG] delete_task payload:',
        JSON.stringify(payload, null, 2),
      );
      let acked = false;
      const safeAck = async () => {
        if (!acked) {
          acked = true;
          await ack();
        }
      };
      await safeAck();
      setImmediate(async () => {
        try {
          // const workspace_id = body.team.id;
          // const rows = await taskModel.getOpenTasks(workspace_id);
          // if (!rows.length) {
          //   await client.chat.postEphemeral({
          //     channel: body.channel.id,
          //     user: body.user.id,
          //     text: 'No open tasks to delete.',
          //   });
          //   return;
          // }
          // await client.views.open({
          //   trigger_id: body.trigger_id,
          //   view: getDeleteTaskModal(rows),
          // });
          console.log(
            '[DEBUG] delete_task action handler would open modal here',
          );
        } catch (err) {
          await client.chat.postEphemeral({
            channel: body.channel.id,
            user: body.user.id,
            text: 'Error fetching tasks.',
          });
        }
      });
    },
  );
};
