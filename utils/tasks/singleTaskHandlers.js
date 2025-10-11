const { getCompleteTaskModal } = require('../../blockKit/completeTaskModal');
const { getEditTaskModal } = require('../../blockKit/editTaskModal');
const { getDeleteTaskModal } = require('../../blockKit/deleteTaskModal');

const taskModel = require('../../models/taskModel');
function registerSingleTaskHandlers(app) {
  // Complete button handler (precise action_id match)
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

  // Edit button handler (precise action_id match)
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

  // Delete button handler (precise action_id match)
  app.action('delete_task', async ({ ack, body, client }) => {
    console.log('[DEBUG] delete_task action handler fired');
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
        console.log('[DEBUG] delete_task action handler would open modal here');
      } catch (err) {
        await client.chat.postEphemeral({
          channel: body.channel.id,
          user: body.user.id,
          text: 'Error fetching tasks.',
        });
      }
    });
  });

  // ...existing code...
  // let selectedTaskId = null;
  // if (action && action.selected_option) {
  //   selectedTaskId = action.selected_option.value;
  // } else if (
  //   payload &&
  app.action(
    (payload) => {
      // Only match for delete modal's task select, and only for block_actions
      if (!payload || payload.type !== 'block_actions') return false;
      if (!payload.actions || !Array.isArray(payload.actions)) return false;
      if (
        !payload.view ||
        payload.view.callback_id !== 'delete_task_modal_submit'
      )
        return false;
      return payload.actions.some(
        (a) => a.action_id === 'task_select' && a.block_id === 'task_block',
      );
    },
    async ({ ack, body, client, action, payload }) => {
      console.log('[DEBUG] dynamic task_select handler fired');
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
}

module.exports = { registerSingleTaskHandlers };
