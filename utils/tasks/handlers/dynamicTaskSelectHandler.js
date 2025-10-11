// const { getDeleteTaskModal } = require('../../../blockKit/deleteTaskModal');
// const taskModel = require('../../../models/taskModel');

module.exports = function registerDynamicTaskSelectHandler(app) {
  app.action(
    (payload) => {
      return (
        payload &&
        payload.type === 'block_actions' &&
        payload.actions &&
        Array.isArray(payload.actions) &&
        payload.actions.some(
          (a) => a.action_id === 'task_select' && a.type !== 'button',
        ) &&
        payload.view &&
        payload.view.callback_id === 'delete_task_modal_submit'
      );
    },
    async ({ ack, body, client, action, payload }) => {
      console.log('[DEBUG] dynamic task_select handler fired');
      console.log(
        '[DEBUG] dynamic task_select payload:',
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
      try {
        // const workspace_id = body.team.id;
        // const rows = await taskModel.getOpenTasks(workspace_id);
        // let selectedTaskId = null;
        // if (action && action.selected_option) {
        //   selectedTaskId = action.selected_option.value;
        // } else if (
        //   payload &&
        //   payload.actions &&
        //   payload.actions[0] &&
        //   payload.actions[0].selected_option
        // ) {
        //   selectedTaskId = payload.actions[0].selected_option.value;
        // }
        // if (!selectedTaskId) return;
        // await client.views.update({
        //   view_id: body.view.id,
        //   hash: body.view.hash,
        //   view: getDeleteTaskModal(rows, selectedTaskId),
        // });
        console.log(
          '[DEBUG] dynamic task_select handler would update modal here',
        );
      } catch (err) {
        console.error('Error in dynamic task_select handler:', err);
      }
    },
  );
};
