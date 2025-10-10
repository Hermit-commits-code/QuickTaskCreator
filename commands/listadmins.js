// /listadmins command handler (modal-based)
const { getListAdminsModal } = require('../blockKit/listAdminsModal');
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');

module.exports = function (app, db) {
  // Promisify db.all for async/await
  function getAdminsAsync() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM admins', [], (err, admins) => {
        if (err) return reject(err);
        resolve(admins);
      });
    });
  }

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
    getTokenForTeam(workspace_id, async (err, botToken) => {
      if (err || !botToken) {
        if (logger)
          logger.error(
            '[listadmins] No bot token found for workspace:',
            workspace_id,
            err,
          );
        else
          console.error(
            '[listadmins] No bot token found for workspace:',
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
        const admins = await getAdminsAsync();
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
  });
};
