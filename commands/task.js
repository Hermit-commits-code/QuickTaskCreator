// /task command handler
const { logWorkspace, logUser } = require('../models/analyticsModel');
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
module.exports = function (app, db) {
  const { getTaskModal } = require('../blockKit/taskModal');
  app.command('/task', async ({ ack, client, body, logger }) => {
    await ack();
    const workspace_id = body.team_id;
    const channel_id = body.channel_id;
    const user_id = body.user_id;
    if (logger) {
      logger.info(
        `[task] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
      );
    } else {
      console.log(
        '[task] workspace_id:',
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
            '[task] No bot token found for workspace:',
            workspace_id,
            err,
          );
        else
          console.error(
            '[task] No bot token found for workspace:',
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
      try {
        await realClient.views.open({
          trigger_id: body.trigger_id,
          view: getTaskModal(channel_id),
        });
      } catch (apiErr) {
        if (logger)
          logger.error('[task] Slack API error (modal open):', apiErr);
        else console.error('[task] Slack API error (modal open):', apiErr);
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
    });
  });
  app.view('task_modal_submit', async ({ ack, body, view, client, logger }) => {
    await ack();
    const description =
      view.state.values.description_block.description_input.value;
    const assignedUser = view.state.values.user_block.user_select.selected_user;
    const dueDate = view.state.values.due_block.due_input.value;
    const category =
      view.state.values.category_block?.category_input?.value || '';
    const tags = view.state.values.tags_block?.tags_input?.value || '';
    const priority =
      view.state.values.priority_block?.priority_select?.selected_option
        ?.value || 'Medium';
    const recurrence_type =
      view.state.values.recurrence_type_block?.recurrence_type_select
        ?.selected_option?.value || 'none';
    const recurrence_interval =
      parseInt(
        view.state.values.recurrence_interval_block?.recurrence_interval_input
          ?.value,
      ) || 1;
    const creatorId = body.user.id;
    let channelId = null;
    try {
      if (view.private_metadata) {
        const meta = JSON.parse(view.private_metadata);
        if (meta.channel_id) channelId = meta.channel_id;
      }
    } catch (e) {
      channelId = view.private_metadata || null;
    }
    const workspace_id = body.team.id || body.team_id;
    getTokenForTeam(workspace_id, async (err, botToken) => {
      if (err || !botToken) {
        if (logger)
          logger.error(
            '[task_modal_submit] No bot token found for workspace:',
            workspace_id,
            err,
          );
        else
          console.error(
            '[task_modal_submit] No bot token found for workspace:',
            workspace_id,
            err,
          );
        if (channelId && channelId.startsWith('C')) {
          await client.chat.postEphemeral({
            channel: channelId,
            user: creatorId,
            text: ':x: App not properly installed for this workspace. Please reinstall.',
          });
        }
        return;
      }
      const realClient = new WebClient(botToken);
      db.run(
        `INSERT INTO tasks (workspace_id, description, assigned_user, due_date, category, tags, priority, recurrence_type, recurrence_interval) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          workspace_id,
          description,
          assignedUser,
          dueDate,
          category,
          tags,
          priority,
          recurrence_type,
          recurrence_interval,
        ],
        async function (err) {
          if (channelId && channelId.startsWith('C')) {
            if (err) {
              await realClient.chat.postEphemeral({
                channel: channelId,
                user: creatorId,
                text: '❗ Error creating task.',
              });
            } else {
              await realClient.chat.postEphemeral({
                channel: channelId,
                user: creatorId,
                text: `:white_check_mark: Task created: *${description}* (Assigned to: <@${assignedUser}>) (Due: ${dueDate}) [${category}] [${tags}] [Priority: ${priority}]`,
              });
              if (assignedUser !== creatorId) {
                await realClient.chat.postEphemeral({
                  channel: channelId,
                  user: assignedUser,
                  text: `:bell: You’ve been assigned a new task by <@${creatorId}>: *${description}* (Due: ${dueDate}) [${category}] [${tags}] [Priority: ${priority}]`,
                });
              }
            }
          } else {
            if (logger)
              logger.error(
                '[ERROR] No valid channel_id for postEphemeral in /task modal submission.',
                channelId,
              );
            else
              console.error(
                '[ERROR] No valid channel_id for postEphemeral in /task modal submission.',
                channelId,
              );
          }
        },
      );
    });
  });
  // Update help text for /task command
  app.command('/task-help', async ({ ack, respond }) => {
    await ack();
    respond({
      text: 'To create a task, simply type /task and press enter. Fill out the details in the popup modal. No need to type the task info in the command line.',
      response_type: 'ephemeral',
    });
  });
};
