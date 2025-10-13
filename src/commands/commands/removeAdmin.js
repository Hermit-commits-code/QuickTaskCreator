// /removeadmin command handler

const { getRemoveAdminModal } = require('../blockKit/removeAdminModal');
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { isAdmin, removeAdmin } = require('../models/adminModel');
const { logActivity } = require('../models/activityLogModel');
const { WebClient } = require('@slack/web-api');

module.exports = function (app) {
  // /removeadmin now opens a modal with a dropdown of current admins
  app.command('/removeadmin', async ({ ack, body, client, logger }) => {
    await ack();
    const workspace_id = body.team_id;
    const channel_id = body.channel_id;
    const user_id = body.user_id;
    if (logger) {
      logger.info(
        `[removeadmin] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
      );
    } else {
      console.log(
        '[removeadmin] workspace_id:',
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
          '[removeadmin] No bot token found for workspace:',
          workspace_id,
        );
      else
        console.error(
          '[removeadmin] No bot token found for workspace:',
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
    // Only allow current admins to remove other admins
    const userIsAdmin = await isAdmin(user_id, workspace_id);
    if (!userIsAdmin) {
      await realClient.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        text: '❗ Only admins can remove other admins.',
      });
      return;
    }
    // Get all admins for dropdown, filter out current user
    const db = await require('../db')();
    const admins = await db
      .collection('admins')
      .find({ workspace_id })
      .toArray();
    if (!admins.length) {
      await realClient.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        text: 'No admins found.',
      });
      return;
    }
    const filteredAdmins = admins.filter((a) => a.user_id !== user_id);
    if (!filteredAdmins.length) {
      await realClient.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        text: 'No other admins to remove.',
      });
      return;
    }
    try {
      await realClient.views.open({
        trigger_id: body.trigger_id,
        view: getRemoveAdminModal(filteredAdmins),
      });
    } catch (apiErr) {
      if (logger)
        logger.error('[removeadmin] Slack API error (modal open):', apiErr);
      else console.error('[removeadmin] Slack API error (modal open):', apiErr);
      await realClient.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        text: ':x: An error occurred opening the modal. Please try again or contact support.',
      });
    }
  });

  // Modal submission handler
  app.view(
    'remove_admin_modal_submit',
    async ({ ack, body, view, client, logger }) => {
      await ack();
      const user = body.user.id;
      const values = view.state.values;
      const adminId = values.admin_block.admin_select.selected_option.value;
      const workspace_id = body.team.id;
      // Safely get channel ID for ephemeral message
      let channelId =
        body.view && body.view.private_metadata
          ? body.view.private_metadata
          : body.channel && body.channel.id
          ? body.channel.id
          : null;
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        if (logger)
          logger.error(
            '[removeadmin modal] No bot token found for workspace:',
            workspace_id,
          );
        else
          console.error(
            '[removeadmin modal] No bot token found for workspace:',
            workspace_id,
          );
        if (channelId) {
          await client.chat.postEphemeral({
            channel: channelId,
            user,
            text: ':x: App not properly installed for this workspace. Please reinstall.',
          });
        }
        return;
      }
      const realClient = new WebClient(botToken);
      const result = await removeAdmin(adminId, workspace_id);
      logActivity(
        user,
        'remove_admin',
        `Admin privileges removed for <@${adminId}>`,
      );
      if (!channelId) {
        if (logger)
          logger.error(
            '[ERROR] Unable to send feedback for /remove-admin. No valid channel context.',
          );
        else
          console.error(
            '[ERROR] Unable to send feedback for /remove-admin. No valid channel context.',
          );
        return;
      }
      if (!result || result.deletedCount === 0) {
        await realClient.chat.postEphemeral({
          channel: channelId,
          user,
          text: '❗ Failed to remove admin. User not found or database error.',
        });
      } else {
        await realClient.chat.postEphemeral({
          channel: channelId,
          user,
          text: `:no_entry: Admin privileges removed for <@${adminId}>.`,
        });
      }
    },
  );
};
