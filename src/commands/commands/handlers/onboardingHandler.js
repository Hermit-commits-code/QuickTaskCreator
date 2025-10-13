// Onboarding modal handler
const { setSetting, getSetting } = require('../../models/settingsModel');
const { getTokenForTeam } = require('../../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');

async function handleOnboardingModal(app) {
  app.view(
    'onboarding_modal_submit',
    async ({ ack, body, view, client, context }) => {
      await ack();
      const workspace_id = body.team.id;
      const user_id = body.user.id;
      const digest_channel =
        view.state.values.digest_channel_block.digest_channel_input.value;
      const digest_time =
        view.state.values.digest_time_block.digest_time_input.value;
      const reminder_time =
        view.state.values.reminder_time_block.reminder_time_input.value;
      await setSetting('digest_channel', digest_channel, workspace_id);
      await setSetting('digest_time', digest_time, workspace_id);
      await setSetting('reminder_time', reminder_time, workspace_id);
      const botToken = await getTokenForTeam(workspace_id);
      const logger = (context && context.logger) || console;
      if (!botToken) {
        logger.error(
          '[welcome modal] No bot token found for workspace:',
          workspace_id,
        );
        return;
      }
      const realClient = new WebClient(botToken);
      try {
        await realClient.chat.postMessage({
          channel: user_id,
          text: 'Your workspace is set up! Use /task to create your first task, or /help for more info.',
        });
      } catch (apiErr) {
        logger.error('[welcome modal] Slack API error (postMessage):', apiErr);
      }
    },
  );
}

module.exports = { handleOnboardingModal };
