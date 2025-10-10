// Command handler for deleting all workspace data
const { db } = require('../models/taskModel');
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
module.exports = function (app) {
  const { isAdmin } = require('../models/adminModel');
  function isAdminAsync(user_id, workspace_id) {
    return new Promise((resolve, reject) => {
      isAdmin(user_id, workspace_id, (err, isAdminUser) => {
        if (err) return reject(err);
        resolve(isAdminUser);
      });
    });
  }

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
        let isAdminUser = false;
        try {
          isAdminUser = await isAdminAsync(user_id, workspace_id);
        } catch (err) {
          await client.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: ':no_entry: Only workspace admins can delete all data.',
          });
          return;
        }
        if (!isAdminUser) {
          await client.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: ':no_entry: Only workspace admins can delete all data.',
          });
          return;
        }
        getTokenForTeam(workspace_id, async (err, botToken) => {
          if (err || !botToken) {
            if (logger)
              logger.error(
                '[delete-workspace-data] No bot token found for workspace:',
                workspace_id,
                err,
              );
            else
              console.error(
                '[delete-workspace-data] No bot token found for workspace:',
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
        });
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
        db.run('DELETE FROM tasks WHERE workspace_id = ?', [workspace_id]);
        db.run('DELETE FROM feedback WHERE workspace_id = ?', [workspace_id]);
        db.run('DELETE FROM bug_reports WHERE workspace_id = ?', [
          workspace_id,
        ]);
        db.run('DELETE FROM admins WHERE workspace_id = ?', [workspace_id]);
        db.run('DELETE FROM settings WHERE workspace_id = ?', [workspace_id]);
        db.run('DELETE FROM users WHERE workspace_id = ?', [workspace_id]);
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
