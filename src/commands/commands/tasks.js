const { logWorkspace, logUser } = require('../../models/models/analyticsModel');
const { getTokenForTeam } = require('../../models/models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
module.exports = function (app) {
  // Register modularized handlers
  const {
    registerSingleTaskHandlers,
  } = require('../../utils/utils/tasks/singleTaskHandlers');
  registerSingleTaskHandlers(app);
  const {
    registerBatchActions,
  } = require('../../utils/utils/tasks/batchActionsHandlers');
  registerBatchActions(app);

  // /tasks command and modal
  app.command('/tasks', async ({ ack, respond, client, body, logger }) => {
    await ack();
    const workspace_id = body.team_id;
    const channel_id = body.channel_id;
    const user_id = body.user_id;
    if (logger) {
      logger.info(
        `[tasks] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
      );
    } else {
      console.log(
        '[tasks] workspace_id:',
        workspace_id,
        'channel_id:',
        channel_id,
        'user_id:',
        user_id,
      );
    }
    logWorkspace(workspace_id, 'Slack Workspace');
    logUser(user_id, workspace_id, 'Slack User');
    const botToken = await getTokenForTeam(workspace_id);
    if (!botToken) {
      if (logger)
        logger.error('[tasks] No bot token found for workspace:', workspace_id);
      else
        console.error(
          '[tasks] No bot token found for workspace:',
          workspace_id,
        );
      respond({
        text: ':x: App not properly installed for this workspace. Please reinstall.',
        response_type: 'ephemeral',
      });
      return;
    }
    const realClient = new WebClient(botToken);
    try {
      const db = await require('../../db')();
      const rows = await db
        .collection('tasks')
        .find({ status: 'open', workspace_id })
        .toArray();
      if (rows.length === 0) {
        respond({ text: 'No open tasks.', response_type: 'ephemeral' });
        return;
      }
      const blocks = rows.map((t) => {
        let assigned = t.assigned_user
          ? ` _(Assigned to: <@${t.assigned_user}> )_`
          : '';
        let due = t.due_date ? ` _(Due: ${t.due_date})_` : '';
        let category = t.category ? ` _(Category: ${t.category})_` : '';
        let tags = t.tags ? ` _(Tags: ${t.tags})_` : '';
        let priority = t.priority ? ` _(Priority: ${t.priority})_` : '';
        return {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${t.description}*${assigned}${due}${category}${tags}${priority}`,
          },
          accessory: {
            type: 'button',
            text: { type: 'plain_text', text: 'Complete' },
            action_id: `complete_task_${t._id}`,
            value: String(t._id),
          },
        };
      });
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Edit' },
            action_id: 'edit_task',
            value: 'edit',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Delete' },
            action_id: 'delete_task',
            value: 'delete',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Batch Actions' },
            action_id: 'batch_task_actions',
            value: 'batch',
          },
        ],
      });
      await realClient.chat.postMessage({
        channel: channel_id,
        blocks,
        text: 'Open Tasks',
      });
    } catch (error) {
      if (logger) logger.error('[tasks] Slack API error:', error);
      else console.error('[tasks] Slack API error:', error);
      if (error.data && error.data.error === 'channel_not_found') {
        respond({
          text: ':x: Channel not found or bot is not a member. Please invite the bot to this channel.',
          response_type: 'ephemeral',
        });
      } else if (error.data && error.data.error === 'user_not_found') {
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
  });
};
