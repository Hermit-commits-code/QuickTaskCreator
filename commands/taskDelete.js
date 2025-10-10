const { getDeleteTaskModal } = require('../blockKit/deleteTaskModal');
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');

// /task-delete command handler
const { logWorkspace, logUser } = require('../models/analyticsModel');
module.exports = function (app, db) {
  app.command(
    '/task-delete',
    async ({ command, ack, client, body, respond, logger }) => {
      try {
        await ack();
        const workspace_id = body.team_id;
        const channel_id = body.channel_id;
        const user_id = body.user_id;
        if (logger) {
          logger.info(
            `[task-delete] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
          );
        } else {
          console.log(
            '[task-delete] workspace_id:',
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
                '[task-delete] No bot token found for workspace:',
                workspace_id,
                err,
              );
            else
              console.error(
                '[task-delete] No bot token found for workspace:',
                workspace_id,
                err,
              );
            respond({
              text: ':x: App not properly installed for this workspace. Please reinstall.',
              response_type: 'ephemeral',
            });
            return;
          }
          const realClient = new WebClient(botToken);
          const id = command.text.trim();
          if (!id) {
            db.all(
              "SELECT id, description, due_date FROM tasks WHERE status = 'open' AND workspace_id = ?",
              [workspace_id],
              async (err, rows) => {
                if (err || !rows || rows.length === 0) {
                  respond({
                    text: 'No open tasks to delete.',
                    response_type: 'ephemeral',
                  });
                  return;
                }
                try {
                  await realClient.views.open({
                    trigger_id: body.trigger_id,
                    view: {
                      ...getDeleteTaskModal(rows),
                      private_metadata: JSON.stringify({
                        channel_id: body.channel_id,
                      }),
                    },
                  });
                } catch (apiErr) {
                  if (logger)
                    logger.error(
                      '[task-delete] Slack API error (modal open):',
                      apiErr,
                    );
                  else
                    console.error(
                      '[task-delete] Slack API error (modal open):',
                      apiErr,
                    );
                  if (
                    apiErr.data &&
                    apiErr.data.error === 'channel_not_found'
                  ) {
                    respond({
                      text: ':x: Channel not found or bot is not a member. Please invite the bot to this channel.',
                      response_type: 'ephemeral',
                    });
                  } else if (
                    apiErr.data &&
                    apiErr.data.error === 'user_not_found'
                  ) {
                    respond({
                      text: ':x: User not found. Please check the user ID.',
                      response_type: 'ephemeral',
                    });
                  } else {
                    respond({
                      text: ':x: An unexpected error occurred. Please contact support.',
                      response_type: 'ephemeral',
                    });
                  }
                }
              },
            );
            return;
          }
          db.get(
            'SELECT description, due_date FROM tasks WHERE id = ? AND workspace_id = ?',
            [id, workspace_id],
            async (err, row) => {
              if (err || !row) {
                respond({
                  text: '\u2757 Task not found.',
                  response_type: 'ephemeral',
                });
                return;
              }
              try {
                await realClient.views.open({
                  trigger_id: body.trigger_id,
                  view: {
                    ...getDeleteTaskModal([
                      {
                        id,
                        description: row.description,
                        due_date: row.due_date,
                      },
                    ]),
                    private_metadata: JSON.stringify({
                      channel_id: body.channel_id,
                    }),
                  },
                });
              } catch (apiErr) {
                if (logger)
                  logger.error(
                    '[task-delete] Slack API error (modal open):',
                    apiErr,
                  );
                else
                  console.error(
                    '[task-delete] Slack API error (modal open):',
                    apiErr,
                  );
                if (apiErr.data && apiErr.data.error === 'channel_not_found') {
                  respond({
                    text: ':x: Channel not found or bot is not a member. Please invite the bot to this channel.',
                    response_type: 'ephemeral',
                  });
                } else if (
                  apiErr.data &&
                  apiErr.data.error === 'user_not_found'
                ) {
                  respond({
                    text: ':x: User not found. Please check the user ID.',
                    response_type: 'ephemeral',
                  });
                } else {
                  respond({
                    text: ':x: An unexpected error occurred. Please contact support.',
                    response_type: 'ephemeral',
                  });
                }
              }
            },
          );
        });
      } catch (error) {
        if (logger) logger.error('[task-delete] error:', error);
        else console.error('/task-delete error:', error);
        respond({
          text: ':x: Internal error. Please try again later.',
          response_type: 'ephemeral',
        });
      }
    },
  );

  app.view('delete_task_modal_submit', async ({ ack, body, view, client }) => {
    await ack();
    // Log analytics
    const workspace_id = body.team.id;
    logUser(body.user.id, workspace_id, 'Slack User');
    // Get selected task from modal
    const taskId =
      view.state.values.task_block.task_select.selected_option.value;
    const reason = view.state.values.reason_block.reason_input.value;
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
    // Get the correct bot token for this workspace
    getTokenForTeam(workspace_id, async (err, botToken) => {
      if (err || !botToken) {
        console.error('No bot token found for workspace:', workspace_id, err);
        return;
      }
      const realClient = new WebClient(botToken);
      db.run(
        'DELETE FROM tasks WHERE id = ? AND workspace_id = ?',
        [taskId, workspace_id],
        async function (err) {
          const { logActivity } = require('../models/activityLogModel');
          logActivity(
            body.user.id,
            'delete_task',
            `Task ${taskId} deleted. Reason: ${reason || 'N/A'}`,
          );
          let msg = '';
          if (err || this.changes === 0) {
            msg =
              '\u2757 Failed to delete task. Task not found or database error.';
          } else {
            msg = `:wastebasket: Task ${taskId} deleted. ${
              reason ? 'Reason: ' + reason : ''
            }`;
          }
          if (channel_id && channel_id.startsWith('C')) {
            await realClient.chat.postEphemeral({
              channel: channel_id,
              user: body.user.id,
              text: msg,
            });
          } else {
            console.error(
              '[ERROR] No valid channel_id for postEphemeral in /task-delete modal submission.',
              channel_id,
            );
          }
        },
      );
    });
  });
};
