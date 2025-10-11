// /listadmins command handler (modal-based)
const { getListAdminsModal } = require('../blockKit/listAdminsModal');
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');

module.exports = function (app) {
  app.command('/listadmins', async ({ ack, body, client, logger }) => {
    await ack();
    const workspace_id = body.team_id;
    const channel_id = body.channel_id;
    const user_id = body.user_id;
    if (logger) {
      logger.info(
        `[listadmins] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
      );
    } else {
      console.log(
        '[listadmins] workspace_id:',
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
          '[listadmins] No bot token found for workspace:',
          workspace_id,
        );
      else
        console.error(
          '[listadmins] No bot token found for workspace:',
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
      const db = await require('../db')();
      const admins = await db
        .collection('admins')
        .find({ workspace_id })
        .toArray();
      await realClient.views.open({
        trigger_id: body.trigger_id,
        view: getListAdminsModal(admins),
      });
    } catch (err) {
      if (logger)
        logger.error(
          '[listadmins] Error fetching admins or opening modal:',
          err,
        );
      else console.error('[ERROR] /listadmins:', err);
      await realClient.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        text: 'Error fetching admins or opening modal.',
      });
    }
  });
};
