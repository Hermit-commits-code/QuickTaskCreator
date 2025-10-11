// Welcome/onboarding message for first-time users
const { logWorkspace, logUser } = require('./handlers/analytics');
const { sendWelcomeMessage } = require('./handlers/welcomeMessage');
const { handleOnboardingModal } = require('./handlers/onboardingHandler');
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');

module.exports = function (app) {
  // Analytics and onboarding event
  app.event('app_home_opened', async ({ event, client, context }) => {
    try {
      await logWorkspace(event.team, 'Slack Workspace');
      await logUser(event.user, event.team, 'Slack User');
      const workspace_id = event.team;
      const user_id = event.user;
      const logger = context.logger || console;
      logger.info(
        `[welcome] workspace_id: ${workspace_id}, user_id: ${user_id}`,
      );
      const { getSetting, setSetting } = require('../models/settingsModel');
      const { getTokenForTeam } = require('../models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        logger.error(
          '[welcome] No bot token found for workspace:',
          workspace_id,
        );
        return;
      }
      const realClient = new WebClient(botToken);
      const onboarded = await getSetting('onboarded', workspace_id);
      if (!onboarded) {
        await setSetting('onboarded', 'true', workspace_id);
        await setSetting('digest_channel', '', workspace_id);
        await setSetting('digest_time', '0 9 * * *', workspace_id);
        await setSetting('reminder_time', '0 8 * * *', workspace_id);
        // Show onboarding modal
        try {
          await realClient.views.open({
            trigger_id: user_id,
            view: {
              type: 'modal',
              callback_id: 'onboarding_modal_submit',
              title: {
                type: 'plain_text',
                text: 'Welcome to Quick Task Creator',
              },
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: "Welcome! Let's get your workspace set up.\n\n• Set your digest channel\n• Choose reminder times\n• Review privacy settings\n\nYou can change these later in /setconfig.",
                  },
                },
                { type: 'divider' },
                {
                  type: 'input',
                  block_id: 'digest_channel_block',
                  label: { type: 'plain_text', text: 'Digest Channel' },
                  element: {
                    type: 'plain_text_input',
                    action_id: 'digest_channel_input',
                    placeholder: { type: 'plain_text', text: '#general' },
                  },
                },
                {
                  type: 'input',
                  block_id: 'digest_time_block',
                  label: { type: 'plain_text', text: 'Digest Time (cron)' },
                  element: {
                    type: 'plain_text_input',
                    action_id: 'digest_time_input',
                    placeholder: { type: 'plain_text', text: '0 9 * * *' },
                  },
                },
                {
                  type: 'input',
                  block_id: 'reminder_time_block',
                  label: { type: 'plain_text', text: 'Reminder Time (cron)' },
                  element: {
                    type: 'plain_text_input',
                    action_id: 'reminder_time_input',
                    placeholder: { type: 'plain_text', text: '0 8 * * *' },
                  },
                },
                { type: 'divider' },
                {
                  type: 'context',
                  elements: [
                    {
                      type: 'mrkdwn',
                      text: '*Privacy:* Basic usage analytics are collected to improve the app. No personal or message content is stored. Contact support to opt out.',
                    },
                  ],
                },
              ],
              submit: { type: 'plain_text', text: 'Save & Continue' },
            },
          });
        } catch (apiErr) {
          logger.error('[welcome] Slack API error (modal open):', apiErr);
        }
      } else {
        // Only send onboarding message to new users (first app_home_opened)
        const welcomed = await getSetting(
          `user_${user_id}_welcomed`,
          workspace_id,
        );
        if (!welcomed) {
          await setSetting(`user_${user_id}_welcomed`, 'true', workspace_id);
          try {
            await sendWelcomeMessage(realClient, user_id);
          } catch (apiErr) {
            logger.error(
              '[welcome] Slack API error (welcome message):',
              apiErr,
            );
          }
        }
      }
    } catch (error) {
      const logger = (context && context.logger) || console;
      logger.error('Error sending welcome message:', error);
    }
  });

  // Onboarding modal submission handler
  const { handleOnboardingModal } = require('./handlers/onboardingHandler');
  handleOnboardingModal(app);
};
