const {
  getDeleteTaskModal,
} = require('../../blockKit/blockKit/deleteTaskModal');
const { getTokenForTeam } = require('../../models/models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');
const { logWorkspace, logUser } = require('../../models/models/analyticsModel');
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
        // Handler implementation goes here (function body was previously duplicated and is now removed)
      } catch (err) {
        if (logger) logger.error('[task-delete] error:', err);
        else console.error('/task-delete error:', err);
        respond({
          text: ':x: Internal error. Please try again later.',
          response_type: 'ephemeral',
        });
      }
    },
  );
};
