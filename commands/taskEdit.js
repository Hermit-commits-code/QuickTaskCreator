// /task-edit command handler

const { getEditTaskModal } = require('../blockKit/editTaskModal');
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');

const { logWorkspace, logUser } = require('../models/analyticsModel');
module.exports = function (app, db) {
  // /task-edit command now opens modal
  app.command('/task-edit', async ({ ack, body, client, logger }) => {
    await ack();
    const workspace_id = body.team_id;
    const channel_id = body.channel_id;
    const user_id = body.user_id;
    if (logger) {
      logger.info(
        `[task-edit] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
      );
    } else {
      console.log(
        '[task-edit] workspace_id:',
        workspace_id,
        'channel_id:',
        channel_id,
        'user_id:',
        user_id,
      );
    }
    logWorkspace(workspace_id, 'Slack Workspace');
    logUser(user_id, workspace_id, 'Slack User');
    getTokenForTeam(workspace_id, async (err, botToken) => {
      if (err || !botToken) {
        if (logger)
          logger.error(
            '[task-edit] No bot token found for workspace:',
            workspace_id,
            err,
          );
        else
          console.error(
            '[task-edit] No bot token found for workspace:',
            workspace_id,
            err,
          );
        await client.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: ':x: App not properly installed for this workspace. Please reinstall.',
        });
        return;
      }
      const realClient = new WebClient(botToken);
      db.all(
        `SELECT * FROM tasks WHERE status = 'open' AND (assigned_user = ? OR assigned_user IS NULL)`,
        [user_id],
        async (err, rows) => {
          if (err || !rows.length) {
            await realClient.chat.postEphemeral({
              channel: channel_id,
              user: user_id,
              text: 'No open tasks to edit.',
            });
            return;
          }
          try {
            await realClient.views.open({
              trigger_id: body.trigger_id,
              view: {
                ...getEditTaskModal(rows),
                private_metadata: JSON.stringify({ channel_id }),
              },
            });
          } catch (apiErr) {
            if (logger)
              logger.error('[task-edit] Slack API error (modal open):', apiErr);
            else
              console.error(
                '[task-edit] Slack API error (modal open):',
                apiErr,
              );
            if (apiErr.data && apiErr.data.error === 'channel_not_found') {
              await realClient.chat.postEphemeral({
                channel: channel_id,
                user: user_id,
                text: ':x: Channel not found or bot is not a member. Please invite the bot to this channel.',
              });
            } else if (apiErr.data && apiErr.data.error === 'user_not_found') {
              await realClient.chat.postEphemeral({
                channel: channel_id,
                user: user_id,
                text: ':x: User not found. Please check the user ID.',
              });
            } else {
              await realClient.chat.postEphemeral({
                channel: channel_id,
                user: user_id,
                text: ':x: An unexpected error occurred. Please contact support.',
              });
            }
          }
        },
      );
    });
  });

  // Modal submission handler
  app.view('edit_task_modal_submit', async ({ ack, body, view, client }) => {
    await ack();
    const user = body.user.id;
    // Log analytics
    logUser(user, body.team.id, 'Slack User');
    const values = view.state.values;
    const taskId = values.task_block.task_select.selected_option.value;
    const newDesc = values.desc_block.desc_input.value;
    const newDue = values.due_block.due_input.value;
    // Get channel_id from private_metadata (robust)
    let channel_id = null;
    try {
      if (view.private_metadata) {
        const meta = JSON.parse(view.private_metadata);
        if (meta.channel_id) channel_id = meta.channel_id;
      }
    } catch (e) {
      channel_id = view.private_metadata || null;
    }
    getTokenForTeam(body.team.id, async (err, botToken) => {
      if (err || !botToken) {
        console.error('No bot token found for workspace:', body.team.id, err);
        return;
      }
      const realClient = new WebClient(botToken);
      db.run(
        `UPDATE tasks SET description = ?, due_date = ? WHERE id = ?`,
        [newDesc, newDue, taskId],
        function (err) {
          const { logActivity } = require('../models/activityLogModel');
          logActivity(
            user,
            'edit_task',
            `Task ${taskId} edited. New description: ${newDesc}, New due: ${newDue}`,
          );
          if (channel_id && channel_id.startsWith('C')) {
            if (err || this.changes === 0) {
              realClient.chat.postEphemeral({
                channel: channel_id,
                user,
                text: '\u2757 Failed to edit task. Task not found or database error.',
              });
            } else {
              realClient.chat.postEphemeral({
                channel: channel_id,
                user,
                text: `:pencil2: Task updated successfully.`,
              });
            }
          } else {
            console.error(
              '[ERROR] No valid channel_id for postEphemeral in /task-edit modal submission.',
              channel_id,
            );
          }
        },
      );
    });
  });
};
