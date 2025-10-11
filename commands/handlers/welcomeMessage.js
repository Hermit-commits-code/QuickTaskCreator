// Welcome message handler
const { setSetting, getSetting } = require('../../models/settingsModel');
const { getTokenForTeam } = require('../../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');

async function sendWelcomeMessage(realClient, user_id) {
  await realClient.chat.postMessage({
    channel: user_id,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '👋 Welcome to Quick Task Creator!' },
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
            text: { type: 'plain_text', text: 'Contact Support' },
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
}

module.exports = { sendWelcomeMessage };
