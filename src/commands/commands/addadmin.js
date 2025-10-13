// /addadmin command handler (modal-based)
const { getAddAdminModal } = require('../blockKit/addAdminModal');
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { addAdmin, isAdmin } = require('../models/adminModel');
const { logActivity } = require('../models/activityLogModel');
const { WebClient } = require('@slack/web-api');

module.exports = function (app) {
  app.command('/add-admin', async ({ ack, body, client, logger }) => {
    try {
      await ack();
      const workspace_id = body.team_id;
      const channel_id = body.channel_id;
      const user_id = body.user_id;
      if (logger) {
        logger.info(
          `[add-admin] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
        );
      } else {
        console.log(
          '[add-admin] workspace_id:',
          workspace_id,
          'channel_id:',
          channel_id,
          'user_id:',
          user_id,
        );
      }
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        if (logger)
          logger.error(
            '[add-admin] No bot token found for workspace:',
            workspace_id,
          );
        else
          console.error(
            '[add-admin] No bot token found for workspace:',
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
      // Check if any admin exists for this workspace
      const isFirstAdmin = !(await isAdmin(user_id, workspace_id));
      if (isFirstAdmin) {
        // Add the user as the first admin
        await addAdmin(user_id, workspace_id);
        await realClient.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: ':white_check_mark: You are now the workspace admin! You can add other admins.',
        });
        try {
          await realClient.views.open({
            trigger_id: body.trigger_id,
            view: {
              ...getAddAdminModal(),
              private_metadata: JSON.stringify({ channel_id }),
            },
          });
        } catch (apiErr) {
          if (logger)
            logger.error('[add-admin] Slack API error (modal open):', apiErr);
          else
            console.error('[add-admin] Slack API error (modal open):', apiErr);
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
      } else {
        // Only admins can add other admins
        const isUserAdmin = await isAdmin(user_id, workspace_id);
        if (!isUserAdmin) {
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: '\u2757 Only admins can add other admins.',
          });
          return;
        }
        try {
          await realClient.views.open({
            trigger_id: body.trigger_id,
            view: {
              ...getAddAdminModal(),
              private_metadata: JSON.stringify({ channel_id }),
            },
          });
        } catch (apiErr) {
          if (logger)
            logger.error('[add-admin] Slack API error (modal open):', apiErr);
          else
            console.error('[add-admin] Slack API error (modal open):', apiErr);
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
      }
    } catch (error) {
      if (logger) logger.error('[add-admin] error:', error);
      else console.error('/add-admin error:', error);
      await client.chat.postEphemeral({
        channel: body.channel_id,
        user: body.user_id,
        text: ':x: Internal error. Please try again later.',
      });
    }
  });

  // Modal submission handler
  app.view(
    'add_admin_modal_submit',
    async ({ ack, body, view, client, logger }) => {
      await ack();
      const user = body.user.id;
      const selectedUser =
        view.state.values.user_block.user_select.selected_user;
      const workspaceId = body.team.id || body.team_id;
      // Get channel_id from private_metadata
      let channel_id = null;
      try {
        if (view.private_metadata) {
          const meta = JSON.parse(view.private_metadata);
          if (meta.channel_id) channel_id = meta.channel_id;
        }
      } catch (e) {}
      const botToken = await getTokenForTeam(workspaceId);
      if (!botToken) {
        if (logger)
          logger.error('No bot token found for workspace:', workspaceId);
        else console.error('No bot token found for workspace:', workspaceId);
        return;
      }
      const realClient = new WebClient(botToken);
      // Prevent duplicate admin entries
      const alreadyAdmin = await isAdmin(selectedUser, workspaceId);
      if (alreadyAdmin) {
        await realClient.chat.postEphemeral({
          channel: channel_id,
          user,
          text: `:information_source: <@${selectedUser}> is already an admin for this workspace.`,
        });
        return;
      }
      await addAdmin(selectedUser, workspaceId);
      logActivity(
        user,
        'add_admin',
        `Admin privileges granted to <@${selectedUser}>`,
      );
      await realClient.chat.postEphemeral({
        channel: channel_id,
        user,
        text: `:white_check_mark: Admin privileges granted to <@${selectedUser}>.`,
      });
    },
  );
};
