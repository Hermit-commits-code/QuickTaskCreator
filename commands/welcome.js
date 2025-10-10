// Welcome/onboarding message for first-time users
const { logWorkspace, logUser } = require('../models/analyticsModel');
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');

module.exports = function (app) {
  const { getSetting, setSetting } = require('../models/settingsModel');
  app.event('app_home_opened', async ({ event, client, context }) => {
    try {
      // Log workspace and user activity for analytics
      logWorkspace(event.team, 'Slack Workspace');
      logUser(event.user, event.team, 'Slack User');
      const workspace_id = event.team;
      const user_id = event.user;
      const logger = context.logger || console;
      logger.info(
        `[welcome] workspace_id: ${workspace_id}, user_id: ${user_id}`,
      );
      getTokenForTeam(workspace_id, async (err, botToken) => {
        if (err || !botToken) {
          logger.error(
            '[welcome] No bot token found for workspace:',
            workspace_id,
            err,
          );
          return;
        }
        const realClient = new WebClient(botToken);
        getSetting('onboarded', workspace_id, async (err, onboarded) => {
          if (err) {
            logger.error('Error checking onboarding status:', err);
            return;
          }
          if (!onboarded) {
            // Create default settings and mark as onboarded
            setSetting('onboarded', 'true', workspace_id, () => {});
            setSetting('digest_channel', '', workspace_id, () => {});
            setSetting('digest_time', '0 9 * * *', workspace_id, () => {});
            setSetting('reminder_time', '0 8 * * *', workspace_id, () => {});
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
                      label: {
                        type: 'plain_text',
                        text: 'Reminder Time (cron)',
                      },
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
            getSetting(
              `user_${user_id}_welcomed`,
              workspace_id,
              async (err, welcomed) => {
                if (!welcomed) {
                  setSetting(
                    `user_${user_id}_welcomed`,
                    'true',
                    workspace_id,
                    () => {},
                  );
                  try {
                    await realClient.chat.postMessage({
                      channel: user_id,
                      blocks: [
                        {
                          type: 'header',
                          text: {
                            type: 'plain_text',
                            text: '👋 Welcome to Quick Task Creator!',
                          },
                        },
                        {
                          type: 'section',
                          text: {
                            type: 'mrkdwn',
                            text: 'Create, assign, and manage tasks directly in Slack. Fast, reliable, and frictionless.',
                          },
                        },
                        { type: 'divider' },
                        {
                          type: 'section',
                          text: {
                            type: 'mrkdwn',
                            text: '*Get started:*\n• Type `/task` to create your first task\n• Use `/help` for a full list of commands and tips\n• For feedback or support, type `/support`',
                          },
                        },
                        {
                          type: 'actions',
                          elements: [
                            {
                              type: 'button',
                              text: { type: 'plain_text', text: 'View Help' },
                              value: 'help',
                              action_id: 'open_help',
                            },
                            {
                              type: 'button',
                              text: {
                                type: 'plain_text',
                                text: 'Contact Support',
                              },
                              value: 'support',
                              action_id: 'open_support',
                            },
                          ],
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
                      text: 'Welcome to Quick Task Creator!',
                    });
                  } catch (apiErr) {
                    logger.error(
                      '[welcome] Slack API error (welcome message):',
                      apiErr,
                    );
                  }
                }
              },
            );
          }
        });
      });
    } catch (error) {
      const logger = (context && context.logger) || console;
      logger.error('Error sending welcome message:', error);
    }
  });

  // Onboarding modal submission handler
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
      // Save settings
      setSetting('digest_channel', digest_channel, workspace_id, () => {});
      setSetting('digest_time', digest_time, workspace_id, () => {});
      setSetting('reminder_time', reminder_time, workspace_id, () => {});
      getTokenForTeam(workspace_id, async (err, botToken) => {
        const logger = (context && context.logger) || console;
        if (err || !botToken) {
          logger.error(
            '[welcome modal] No bot token found for workspace:',
            workspace_id,
            err,
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
          logger.error(
            '[welcome modal] Slack API error (postMessage):',
            apiErr,
          );
        }
      });
    },
  );
};
