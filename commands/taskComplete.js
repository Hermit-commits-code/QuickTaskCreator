const { getCompleteTaskModal } = require('../blockKit/completeTaskModal');
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
const { logWorkspace, logUser } = require('../models/analyticsModel');
module.exports = function (app, db) {
  app.command('/task-complete', async ({ ack, client, body, logger }) => {
    await ack();
    const workspace_id = body.team_id;
    const channel_id = body.channel_id;
    const user_id = body.user_id;
    if (logger) {
      logger.info(
        `[task-complete] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
      );
    } else {
      console.log(
        '[task-complete] workspace_id:',
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
            '[task-complete] No bot token found for workspace:',
            workspace_id,
            err,
          );
        else
          console.error(
            '[task-complete] No bot token found for workspace:',
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
        "SELECT id, description, due_date FROM tasks WHERE status = 'open' AND workspace_id = ?",
        [workspace_id],
        async (err, rows) => {
          if (err || !rows || rows.length === 0) {
            await realClient.chat.postEphemeral({
              channel: channel_id,
              user: user_id,
              text: 'No open tasks to complete.',
            });
            return;
          }
          try {
            await realClient.views.open({
              trigger_id: body.trigger_id,
              view: {
                ...getCompleteTaskModal(rows, { mode: 'complete' }),
                private_metadata: JSON.stringify({ channel_id }),
              },
            });
          } catch (apiErr) {
            if (logger)
              logger.error(
                '[task-complete] Slack API error (modal open):',
                apiErr,
              );
            else
              console.error(
                '[task-complete] Slack API error (modal open):',
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

  app.view(
    'complete_task_modal_submit',
    async ({ ack, body, view, client, logger }) => {
      await ack();
      logUser(body.user.id, body.team.id, 'Slack User');
      const selectedTaskIds = view.state.values.task_block.task_select
        .selected_options
        ? view.state.values.task_block.task_select.selected_options.map(
            (opt) => opt.value,
          )
        : [view.state.values.task_block.task_select.selected_option.value];
      const notes = view.state.values.notes_block.notes_input.value;
      const { logActivity } = require('../models/activityLogModel');
      let completed = [];
      let failed = [];
      let channel_id = null;
      try {
        if (view.private_metadata) {
          const meta = JSON.parse(view.private_metadata);
          if (meta.channel_id) channel_id = meta.channel_id;
        }
      } catch (e) {
        channel_id = view.private_metadata || null;
      }
      if (!channel_id || !channel_id.startsWith('C')) {
        if (logger)
          logger.error(
            '[ERROR] Invalid channel_id for postEphemeral in /task-complete modal submission:',
            channel_id,
          );
        else
          console.error(
            '[ERROR] Invalid channel_id for postEphemeral in /task-complete modal submission:',
            channel_id,
          );
        return;
      }
      const workspace_id = body.team.id;
      const user_id = body.user.id;
      getTokenForTeam(workspace_id, async (err, botToken) => {
        if (err || !botToken) {
          if (logger)
            logger.error(
              '[task-complete modal] No bot token found for workspace:',
              workspace_id,
              err,
            );
          else
            console.error(
              '[task-complete modal] No bot token found for workspace:',
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
        for (const taskId of selectedTaskIds) {
          db.run(
            'UPDATE tasks SET status = "complete" WHERE id = ?',
            [taskId],
            async function (err) {
              logActivity(
                user_id,
                'complete_task',
                `Task ${taskId} marked complete. Notes: ${notes || 'N/A'}`,
              );
              if (err || this.changes === 0) {
                failed.push(taskId);
              } else {
                completed.push(taskId);
              }
              if (completed.length + failed.length === selectedTaskIds.length) {
                let msg = '';
                if (completed.length)
                  msg += `:white_check_mark: Completed: ${completed.join(
                    ', ',
                  )}.`;
                if (failed.length)
                  msg += `\n:warning: Failed: ${failed.join(', ')}.`;
                if (notes) msg += `\nNotes: ${notes}`;
                try {
                  await realClient.chat.postEphemeral({
                    channel: channel_id,
                    user: user_id,
                    text: msg,
                  });
                } catch (apiErr) {
                  if (logger)
                    logger.error(
                      '[task-complete modal] Slack API error:',
                      apiErr,
                    );
                  else
                    console.error(
                      '[task-complete modal] Slack API error:',
                      apiErr,
                    );
                }
              }
            },
          );
        }
      });
    },
  );
};
