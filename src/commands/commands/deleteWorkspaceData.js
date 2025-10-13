const { isAdmin, deleteAdminsForWorkspace } = require('../models/adminModel');
const { deleteTasksForWorkspace } = require('../models/taskModel');
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
const connectDB = require('../db');

// Helper to remove all feedback for a workspace
async function deleteFeedbackForWorkspace(workspace_id) {
  const db = await connectDB();
  await db.collection('feedback').deleteMany({ workspace_id });
}

// Helper to remove all bug reports for a workspace
async function deleteBugReportsForWorkspace(workspace_id) {
  const db = await connectDB();
  await db.collection('bug_reports').deleteMany({ workspace_id });
}

// Helper to remove all settings for a workspace
async function removeAllSettingsForWorkspace(workspace_id) {
  const db = await connectDB();
  await db.collection('settings').deleteMany({ workspace_id });
}

// Helper to remove workspace token
async function removeWorkspaceToken(workspace_id) {
  const db = await connectDB();
  await db.collection('workspace_tokens').deleteMany({ team_id: workspace_id });
}

// Helper to remove notification preferences for all users in a workspace
async function removeNotificationPreferences(workspace_id) {
  const db = await connectDB();
  await db.collection('notification_preferences').deleteMany({ workspace_id });
}

module.exports = function (app) {
  app.command(
    '/delete-workspace-data',
    async ({ ack, body, client, respond, logger }) => {
      await ack();
      const workspace_id = body.team_id;
      const channel_id = body.channel_id;
      const user_id = body.user_id;
      if (logger) {
        logger.info(
          `[delete-workspace-data] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
        );
      } else {
        console.log(
          '[delete-workspace-data] workspace_id:',
          workspace_id,
          'channel_id:',
          channel_id,
          'user_id:',
          user_id,
        );
      }
      try {
        const isAdminUser = await isAdmin(user_id, workspace_id);
        if (!isAdminUser) {
          await client.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: ':no_entry: Only workspace admins can delete all data.',
          });
          return;
        }
        const botToken = await getTokenForTeam(workspace_id);
        if (!botToken) {
          if (logger)
            logger.error(
              '[delete-workspace-data] No bot token found for workspace:',
              workspace_id,
            );
          else
            console.error(
              '[delete-workspace-data] No bot token found for workspace:',
              workspace_id,
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
            view: {
              type: 'modal',
              callback_id: 'delete_workspace_data_confirm',
              title: { type: 'plain_text', text: 'Confirm Data Deletion' },
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: ':warning: This will permanently delete ALL data for this workspace, including tasks, feedback, bug reports, settings, and admin records. This action cannot be undone.\n\nAre you sure you want to proceed?',
                  },
                },
                {
                  type: 'input',
                  block_id: 'confirm_block',
                  label: {
                    type: 'plain_text',
                    text: 'Type DELETE to confirm',
                  },
                  element: {
                    type: 'plain_text_input',
                    action_id: 'confirm_input',
                    placeholder: { type: 'plain_text', text: 'DELETE' },
                  },
                },
              ],
              submit: { type: 'plain_text', text: 'Delete Data' },
              close: { type: 'plain_text', text: 'Cancel' },
              private_metadata: JSON.stringify({ channel_id }),
            },
          });
        } catch (apiErr) {
          if (logger)
            logger.error(
              '[delete-workspace-data] Slack API error (modal open):',
              apiErr,
            );
          else
            console.error(
              '[delete-workspace-data] Slack API error (modal open):',
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
      } catch (error) {
        await client.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: ':x: Internal error. Please try again later.',
        });
      }
    },
  );

  // Modal submission handler
  app.view(
    'delete_workspace_data_confirm',
    async ({ ack, body, view, client }) => {
      await ack();
      const workspace_id = body.team.id;
      const user_id = body.user.id;
      const confirmation = view.state.values.confirm_block.confirm_input.value;
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
      if (confirmation !== 'DELETE') {
        await client.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: ':warning: Data deletion cancelled. You must type DELETE to confirm.',
        });
        return;
      }
      try {
        await deleteTasksForWorkspace(workspace_id);
        await deleteFeedbackForWorkspace(workspace_id);
        await deleteBugReportsForWorkspace(workspace_id);
        await deleteAdminsForWorkspace(workspace_id);
        await removeAllSettingsForWorkspace(workspace_id);
        await removeWorkspaceToken(workspace_id);
        await removeNotificationPreferences(workspace_id);
        await client.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: ':wastebasket: All workspace data has been deleted.',
        });
      } catch (err) {
        await client.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: ':warning: Failed to delete workspace data. Please contact support.',
        });
      }
    },
  );
};
