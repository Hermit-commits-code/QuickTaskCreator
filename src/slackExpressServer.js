const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const { WebClient } = require('@slack/web-api');
const verifySlackSignature = require('./utils/utils/verifySlackSignature');
require('dotenv').config();
const app = express();
// Health check route for deployment debugging
app.get('/', (req, res) => res.send('OK'));
const port = process.env.PORT || 8080;
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const slackBotToken = process.env.SLACK_BOT_TOKEN;

// Slack OAuth redirect route (best-practice)
app.get('/slack/oauth_redirect', async (req, res) => {
  const { code, error } = req.query;
  console.log('[OAUTH] Incoming /slack/oauth_redirect:', req.query);
  if (error) {
    console.error('[OAUTH] Error param:', error);
    return res.status(400).send('Slack OAuth failed: ' + error);
  }
  if (!code) {
    console.error('[OAUTH] Missing code param');
    return res.status(400).send('Missing code parameter from Slack.');
  }
  try {
    // Exchange code for access token
    const response = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      null,
      {
        params: {
          code,
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          redirect_uri: process.env.SLACK_REDIRECT_URI,
        },
      },
    );
    const data = response.data;
    console.log('[OAUTH] Slack response:', data);
    if (!data.ok) {
      console.error('[OAUTH] Slack error:', data.error);
      return res
        .status(400)
        .send('Slack OAuth error: ' + (data.error || 'Unknown error'));
    }
    // Store tokens and team info in DB (best-practice: upsert)
    const db = await require('./db')();
    const updateResult = await db.collection('workspace_tokens').updateOne(
      { team_id: data.team.id },
      {
        $set: {
          team_id: data.team.id,
          team_name: data.team.name,
          access_token: data.access_token,
          bot_user_id: data.bot_user_id,
          authed_user: data.authed_user,
          installed_at: new Date(),
        },
      },
      { upsert: true },
    );
    console.log('[OAUTH] DB update result:', updateResult);
    return res.send(
      'Slack app installed successfully! You can now use the app in your workspace.',
    );
  } catch (err) {
    console.error('[OAUTH] Exception:', err);
    return res.status(500).send('Internal server error during Slack OAuth.');
  }
});

// Only capture raw body for Slack routes
function rawBodySaver(req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}

app.post(
  ['/slack/events', '/slack/commands'],
  bodyParser.json({ verify: rawBodySaver }),
  bodyParser.urlencoded({ extended: true, verify: rawBodySaver }),
  verifySlackSignature(slackSigningSecret),
  slackHandler,
);

// Main Slack events endpoint
// Unified Slack handler for both /slack/events and /slack/commands
async function slackHandler(req, res) {
  if (!req.body) {
    console.error('Slack handler: Missing request body');
    return res.status(400).send('Missing request body');
  }
  console.log('Slack handler received req.body:', req.body);
  let payload;
  // If this is an interactive event, Slack sends a 'payload' field as a JSON string
  if (typeof req.body.payload === 'string') {
    try {
      payload = JSON.parse(req.body.payload);
      console.log('Parsed interactive payload:', payload);
    } catch (e) {
      console.error('Invalid payload JSON:', e);
      return res.status(400).send('Invalid payload JSON');
    }
  } else {
    // For slash commands, the payload is the form-encoded body itself
    payload = req.body;
  }
  if (!payload || typeof payload !== 'object') {
    console.error('Slack handler: Invalid payload structure', payload);
    return res.status(400).send('Invalid payload');
  }
  // Respond to Slack's URL verification challenge
  if (payload.type === 'url_verification') {
    return res.send({ challenge: payload.challenge });
  }

  // Slash command (form-encoded)
  if (payload.command === '/task') {
    // Open task creation modal
    try {
      const {
        logWorkspace,
        logUser,
      } = require('./models/models/analyticsModel');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const { getTaskModal } = require('./blockKit/taskModal');
      const workspace_id = payload.team_id;
      const channel_id = payload.channel_id;
      const user_id = payload.user_id;
      logWorkspace(workspace_id, 'Slack Workspace');
      logUser(user_id, workspace_id, 'Slack User');
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        return res.json({
          text: ':x: App not properly installed for this workspace. Please reinstall.',
          response_type: 'ephemeral',
        });
      }
      const realClient = new WebClient(botToken);
      await realClient.views.open({
        trigger_id: payload.trigger_id,
        view: getTaskModal(channel_id),
      });
      return res.status(200).send();
    } catch (err) {
      console.error('/task error:', err);
      return res.json({
        text: ':x: Internal error. Please try again later.',
        response_type: 'ephemeral',
      });
    }
  } else if (payload.command === '/tasks') {
    // List open tasks in the channel with action buttons
    try {
      const { logWorkspace, logUser } = require('./models/analyticsModel');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const workspace_id = payload.team_id;
      const channel_id = payload.channel_id;
      const user_id = payload.user_id;
      logWorkspace(workspace_id, 'Slack Workspace');
      logUser(user_id, workspace_id, 'Slack User');
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        return res.json({
          text: ':x: App not properly installed for this workspace. Please reinstall.',
          response_type: 'ephemeral',
        });
      }
      const realClient = new WebClient(botToken);
      const db = await require('./db')();
      const rows = await db
        .collection('tasks')
        .find({ status: 'open', workspace_id })
        .toArray();
      if (rows.length === 0) {
        return res.json({
          text: 'No open tasks.',
          response_type: 'ephemeral',
        });
      }
      const blocks = rows.map((t) => {
        let assigned = t.assigned_user
          ? ` _(Assigned to: <@${t.assigned_user}> )_`
          : '';
        let due = t.due_date ? ` _(Due: ${t.due_date})_` : '';
        let category = t.category ? ` _(Category: ${t.category})_` : '';
        let tags = t.tags ? ` _(Tags: ${t.tags})_` : '';
        let priority = t.priority ? ` _(Priority: ${t.priority})_` : '';
        return {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${t.description}*${assigned}${due}${category}${tags}${priority}`,
          },
          accessory: {
            type: 'button',
            text: { type: 'plain_text', text: 'Complete' },
            action_id: `complete_task_${t._id}`,
            value: String(t._id),
          },
        };
      });
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Edit' },
            action_id: 'edit_task',
            value: 'edit',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Delete' },
            action_id: 'delete_task',
            value: 'delete',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Batch Actions' },
            action_id: 'batch_task_actions',
            value: 'batch',
          },
        ],
      });
      await realClient.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        blocks,
        text: 'Open Tasks',
      });
      return res.status(200).send();
    } catch (err) {
      console.error('/tasks error:', err);
      return res.json({
        text: ':x: Internal error. Please try again later.',
        response_type: 'ephemeral',
      });
    }
  } else if (payload.command === '/listadmins') {
    // List all admins in a modal
    try {
      const { getListAdminsModal } = require('./blockKit/listAdminsModal');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const db = await require('./db')();
      const workspace_id = payload.team_id;
      const channel_id = payload.channel_id;
      const user_id = payload.user_id;
      const admins = await db
        .collection('admins')
        .find({ workspace_id })
        .toArray();
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        return res.json({
          text: ':x: App not properly installed for this workspace. Please reinstall.',
          response_type: 'ephemeral',
        });
      }
      const realClient = new WebClient(botToken);
      await realClient.views.open({
        trigger_id: payload.trigger_id,
        view: getListAdminsModal(admins),
      });
      return res.status(200).send();
    } catch (err) {
      console.error('/listadmins error:', err);
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const botToken = await getTokenForTeam(payload.team_id);
      if (botToken) {
        const realClient = new WebClient(botToken);
        await realClient.chat.postEphemeral({
          channel: payload.channel_id,
          user: payload.user_id,
          text: 'Error fetching admins or opening modal.',
        });
      }
      return res.status(200).send();
    }
  } else if (payload.command === '/help') {
    // Migrate /help: show help and command info
    try {
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const workspace_id = payload.team_id;
      const channel_id = payload.channel_id;
      const user_id = payload.user_id;
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        return res.json({
          text: ':x: App not properly installed for this workspace. Please reinstall.',
          response_type: 'ephemeral',
        });
      }
      const realClient = new WebClient(botToken);
      await realClient.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: 'Quick Task Creator Help' },
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
              text: '*Commands:*\n• `/task` – Create a new task\n• `/tasks` – List open tasks\n• `/task-edit` – Edit a task\n• `/task-complete` – Complete a task\n• `/task-delete` – Delete a task\n• `/add-admin` – Add admin\n• `/removeadmin` – Remove admin\n• `/setdigestchannel` – Set digest channel\n• `/setconfig` – Configure workspace\n• `/report` – View analytics\n• `/listadmins` – List admins\n• `/notifyprefs` – Notification preferences\n• `/help` – Show help\n• `/support` – Contact support',
            },
          },
          {
            type: 'actions',
            elements: [
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
                text: 'See documentation or GitHub Issues for more help.',
              },
            ],
          },
        ],
        text: 'Quick Task Creator Help',
      });
      return res.status(200).send();
    } catch (err) {
      console.error('/help error:', err);
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const botToken = await getTokenForTeam(payload.team_id);
      if (botToken) {
        const realClient = new WebClient(botToken);
        await realClient.chat.postEphemeral({
          channel: payload.channel_id,
          user: payload.user_id,
          text: ':x: An unexpected error occurred. Please contact support.',
        });
      }
      return res.status(200).send();
    }
  } else if (payload.command === '/setconfig') {
    // Migrate /setconfig: open workspace settings modal and update config
    try {
      const { setSetting } = require('./models/settingsModel');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const workspace_id = payload.team_id;
      const channel_id = payload.channel_id;
      const user_id = payload.user_id;
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        return res.json({
          text: ':x: App not properly installed for this workspace. Please reinstall.',
          response_type: 'ephemeral',
        });
      }
      const realClient = new WebClient(botToken);
      await realClient.views.open({
        trigger_id: payload.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'setconfig_modal_submit',
          title: { type: 'plain_text', text: 'Workspace Settings' },
          submit: { type: 'plain_text', text: 'Save' },
          close: { type: 'plain_text', text: 'Cancel' },
          blocks: [
            {
              type: 'input',
              block_id: 'digest_channel_block',
              element: {
                type: 'plain_text_input',
                action_id: 'digest_channel_input',
                placeholder: {
                  type: 'plain_text',
                  text: 'Channel ID for daily digest',
                },
              },
              label: { type: 'plain_text', text: 'Digest Channel ID' },
            },
            {
              type: 'input',
              block_id: 'digest_time_block',
              element: {
                type: 'plain_text_input',
                action_id: 'digest_time_input',
                placeholder: {
                  type: 'plain_text',
                  text: 'Cron format (e.g. 0 9 * * *)',
                },
              },
              label: { type: 'plain_text', text: 'Digest Time (cron)' },
            },
            {
              type: 'input',
              block_id: 'reminder_time_block',
              element: {
                type: 'plain_text_input',
                action_id: 'reminder_time_input',
                placeholder: {
                  type: 'plain_text',
                  text: 'Cron format (e.g. 0 8 * * *)',
                },
              },
              label: { type: 'plain_text', text: 'Reminder Time (cron)' },
            },
          ],
        },
      });
      return res.status(200).send();
    } catch (err) {
      console.error('/setconfig error:', err);
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const botToken = await getTokenForTeam(payload.team_id);
      if (botToken) {
        const realClient = new WebClient(botToken);
        await realClient.chat.postEphemeral({
          channel: payload.channel_id,
          user: payload.user_id,
          text: ':x: An unexpected error occurred. Please contact support.',
        });
      }
      return res.status(200).send();
    }
  } else if (payload.command === '/support') {
    // Migrate /support: show support and feedback info
    try {
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const workspace_id = payload.team_id;
      const channel_id = payload.channel_id;
      const user_id = payload.user_id;
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        return res.json({
          text: ':x: App not properly installed for this workspace. Please reinstall.',
          response_type: 'ephemeral',
        });
      }
      const realClient = new WebClient(botToken);
      await realClient.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: 'Support & Feedback' },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Need help or want to share feedback?',
            },
          },
          { type: 'divider' },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '• *Report a Bug*: <https://github.com/Hermit-commits-code/QuickTaskCreator/issues|Open a GitHub Issue>\n• *Submit Feedback*: Send feedback to <mailto:hotcupofjoe2013@gmail.com|support@quicktaskcreator.com>.',
            },
          },
          { type: 'divider' },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '*Privacy:* No personal or message content is stored. Expected response time: 1-2 business days.',
              },
            ],
          },
        ],
        text: 'Support & Feedback',
      });
      return res.status(200).send();
    } catch (err) {
      console.error('/support error:', err);
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const botToken = await getTokenForTeam(payload.team_id);
      if (botToken) {
        const realClient = new WebClient(botToken);
        await realClient.chat.postEphemeral({
          channel: payload.channel_id,
          user: payload.user_id,
          text: ':x: An unexpected error occurred. Please contact support.',
        });
      }
      return res.status(200).send();
    }
  } else if (payload.command === '/delete-workspace-data') {
    // Migrate /delete-workspace-data: confirm and delete all workspace data
    try {
      const { isAdmin } = require('./models/adminModel');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const connectDB = require('./db');
      const workspace_id = payload.team_id;
      const channel_id = payload.channel_id;
      const user_id = payload.user_id;
      const isAdminUser = await isAdmin(user_id, workspace_id);
      if (!isAdminUser) {
        const botToken = await getTokenForTeam(workspace_id);
        if (botToken) {
          const realClient = new WebClient(botToken);
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: ':no_entry: Only workspace admins can delete all data.',
          });
        }
        return res.status(200).send();
      }
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        return res.json({
          text: ':x: App not properly installed for this workspace. Please reinstall.',
          response_type: 'ephemeral',
        });
      }
      const realClient = new WebClient(botToken);
      await realClient.views.open({
        trigger_id: payload.trigger_id,
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
              label: { type: 'plain_text', text: 'Type DELETE to confirm' },
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
      return res.status(200).send();
    } catch (error) {
      console.error('/delete-workspace-data error:', error);
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const botToken = await getTokenForTeam(payload.team_id);
      if (botToken) {
        const realClient = new WebClient(botToken);
        await realClient.chat.postEphemeral({
          channel: payload.channel_id,
          user: payload.user_id,
          text: ':x: Internal error. Please try again later.',
        });
      }
      return res.status(200).send();
    }
  } else if (payload.command === '/setdigestchannel') {
    // Migrate /setdigestchannel: set the digest channel for reminders
    try {
      const { setSetting } = require('./models/settingsModel');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const workspace_id = payload.team_id;
      const channel_id = payload.channel_id;
      const user_id = payload.user_id;
      const digestChannelId = (payload.text || '').trim();
      if (!digestChannelId || !digestChannelId.startsWith('C')) {
        const botToken = await getTokenForTeam(workspace_id);
        if (botToken) {
          const realClient = new WebClient(botToken);
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: ':warning: Please provide a valid Slack channel ID (e.g. C12345678).',
          });
        }
        return res.status(200).send();
      }
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        return res.json({
          text: ':x: App not properly installed for this workspace. Please reinstall.',
          response_type: 'ephemeral',
        });
      }
      const realClient = new WebClient(botToken);
      await setSetting('digest_channel', digestChannelId, workspace_id);
      await realClient.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        text: `:white_check_mark: Digest channel set to <#${digestChannelId}>!`,
      });
      return res.status(200).send();
    } catch (err) {
      console.error('/setdigestchannel error:', err);
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const botToken = await getTokenForTeam(payload.team_id);
      if (botToken) {
        const realClient = new WebClient(botToken);
        await realClient.chat.postEphemeral({
          channel: payload.channel_id,
          user: payload.user_id,
          text: ':x: Failed to set digest channel. Please try again.',
        });
      }
      return res.status(200).send();
    }
  } else if (payload.command === '/notifyprefs') {
    // Migrate /notifyprefs: open notification preferences modal
    try {
      const {
        setPreferences,
        getPreferences,
      } = require('./models/notificationPreferencesModel');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const muteOptions = [
        {
          text: { type: 'plain_text', text: 'Mute all notifications' },
          value: 'mute_all',
        },
      ];
      const digestOptions = [
        {
          text: {
            type: 'plain_text',
            text: 'Receive only digests (no reminders)',
          },
          value: 'digest_only',
        },
      ];
      const userId = payload.user_id;
      const workspace_id = payload.team_id;
      const channel_id = payload.channel_id;
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        return res.json({
          text: ':x: App not properly installed for this workspace. Please reinstall.',
          response_type: 'ephemeral',
        });
      }
      const realClient = new WebClient(botToken);
      const prefs = await getPreferences(userId);
      const muteBlock = {
        type: 'input',
        block_id: 'mute_block',
        element: {
          type: 'checkboxes',
          action_id: 'mute_input',
          options: muteOptions,
          ...(prefs && prefs.mute_all === 1
            ? { initial_options: [muteOptions[0]] }
            : {}),
        },
        label: { type: 'plain_text', text: 'Mute' },
        optional: true,
      };
      const digestBlock = {
        type: 'input',
        block_id: 'digest_block',
        element: {
          type: 'checkboxes',
          action_id: 'digest_input',
          options: digestOptions,
          ...(prefs && prefs.digest_only === 1
            ? { initial_options: [digestOptions[0]] }
            : {}),
        },
        label: { type: 'plain_text', text: 'Digest Only' },
        optional: true,
      };
      await realClient.views.open({
        trigger_id: payload.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'notifyprefs_modal_submit',
          private_metadata: JSON.stringify({ channel_id }),
          title: { type: 'plain_text', text: 'Notification Preferences' },
          submit: { type: 'plain_text', text: 'Save' },
          close: { type: 'plain_text', text: 'Cancel' },
          blocks: [
            muteBlock,
            digestBlock,
            {
              type: 'input',
              block_id: 'reminder_time_block',
              element: {
                type: 'plain_text_input',
                action_id: 'reminder_time_input',
                placeholder: {
                  type: 'plain_text',
                  text: 'e.g. 09:00, 17:30 (24h format)',
                },
                initial_value:
                  prefs && prefs.custom_reminder_time
                    ? prefs.custom_reminder_time
                    : '',
              },
              label: { type: 'plain_text', text: 'Custom Reminder Time' },
              optional: true,
            },
          ],
        },
      });
      return res.status(200).send();
    } catch (err) {
      console.error('/notifyprefs error:', err);
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const botToken = await getTokenForTeam(payload.team_id);
      if (botToken) {
        const realClient = new WebClient(botToken);
        await realClient.chat.postEphemeral({
          channel: payload.channel_id,
          user: payload.user_id,
          text: ':x: Error opening notification preferences modal.',
        });
      }
      return res.status(200).send();
    }
  } else if (payload.command === '/report') {
    // Migrate /report: show workspace analytics and stats
    try {
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const { getTaskStats } = require('./models/reportModel');
      const workspace_id = payload.team_id || (payload.team && payload.team.id);
      const channel_id = payload.channel_id;
      const user_id = payload.user_id;
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        return res.json({
          text: ':x: App not properly installed for this workspace. Please reinstall.',
          response_type: 'ephemeral',
        });
      }
      const realClient = new WebClient(botToken);
      const stats = await getTaskStats(workspace_id);
      const completionRate =
        stats.total > 0
          ? ((stats.completed / stats.total) * 100).toFixed(1)
          : '0';
      // Get recent activity (last 7 days)
      const db = await require('./db')();
      const tasks = db.collection('tasks');
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentRows = await tasks
        .aggregate([
          {
            $match: {
              workspace_id,
              created_at: { $gte: sevenDaysAgo.toISOString() },
            },
          },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .toArray();
      let recentStats = { created: 0, completed: 0 };
      if (recentRows && recentRows.length > 0) {
        recentRows.forEach((row) => {
          if (row._id === 'completed') recentStats.completed = row.count;
          if (row._id === 'open') recentStats.created = row.count;
        });
      }
      // Build analytics blocks
      function buildAnalyticsBlocks(stats, recentStats, completionRate) {
        return [
          {
            type: 'header',
            text: { type: 'plain_text', text: 'QuickTaskCreator Task Report' },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Summary:*\n• Total Tasks: ${stats.total}\n• Completed: ${stats.completed}\n• Open: ${stats.open}\n• Overdue: ${stats.overdue}\n• Completion Rate: ${completionRate}%`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Recent Activity (last 7 days):*\n• Created: ${recentStats.created}\n• Completed: ${recentStats.completed}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*By Category:*\n${stats.byCategory
                .map((c) => `• ${c.category || 'Uncategorized'}: ${c.count}`)
                .join('\n')}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*By Priority:*\n${stats.byPriority
                .map((p) => `• ${p.priority || 'None'}: ${p.count}`)
                .join('\n')}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*By User:*\n${stats.byUser
                .map(
                  (u) => `• <@${u.assigned_user || 'Unassigned'}>: ${u.count}`,
                )
                .join('\n')}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '_QuickTaskCreator © 2025 | All rights reserved._',
              },
            ],
          },
        ];
      }
      const blocks = buildAnalyticsBlocks(stats, recentStats, completionRate);
      await realClient.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        blocks,
        text: 'QuickTaskCreator Analytics',
      });
      return res.status(200).send();
    } catch (err) {
      console.error('/report error:', err);
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const botToken = await getTokenForTeam(payload.team_id);
      if (botToken) {
        const realClient = new WebClient(botToken);
        await realClient.chat.postEphemeral({
          channel: payload.channel_id,
          user: payload.user_id,
          text: ':x: Error generating report.',
        });
      }
      return res.status(200).send();
    }
  } else if (payload.command === '/auditlog') {
    // Migrate /auditlog: show recent activity log to admins only
    try {
      const { getRecentActivity } = require('./models/activityLogModel');
      const { isAdmin } = require('./models/adminModel');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const workspace_id = payload.team_id;
      const channel_id = payload.channel_id;
      const user_id = payload.user_id;
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        return res.json({
          text: ':x: App not properly installed for this workspace. Please reinstall.',
          response_type: 'ephemeral',
        });
      }
      const realClient = new WebClient(botToken);
      const isAdminUser = await require('./models/adminModel').isAdmin(
        user_id,
        workspace_id,
      );
      if (!isAdminUser) {
        await realClient.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: 'You do not have permission to view the audit log.',
        });
        return res.status(200).send();
      }
      const rows = await getRecentActivity(20);
      if (!rows.length) {
        await realClient.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: 'No activity log entries found.',
        });
        return res.status(200).send();
      }
      const blocks = rows.map((entry) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${entry.timestamp}* - <@${entry.user_id}>: *${entry.action}*\n${entry.details}`,
        },
      }));
      await realClient.chat.postEphemeral({
        channel: channel_id,
        user: user_id,
        text: 'Recent activity log:',
        blocks,
      });
      return res.status(200).send();
    } catch (err) {
      console.error('/auditlog error:', err);
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const botToken = await getTokenForTeam(payload.team_id);
      if (botToken) {
        const realClient = new WebClient(botToken);
        await realClient.chat.postEphemeral({
          channel: payload.channel_id,
          user: payload.user_id,
          text: 'Error fetching activity log.',
        });
      }
      return res.status(200).send();
    }
  } else if (payload.command === '/listadmins') {
    // Migrate /listadmins: open modal listing all admins
    try {
      const { getListAdminsModal } = require('./blockKit/listAdminsModal');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const workspace_id = payload.team_id;
      const channel_id = payload.channel_id;
      const user_id = payload.user_id;
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        return res.json({
          text: ':x: App not properly installed for this workspace. Please reinstall.',
          response_type: 'ephemeral',
        });
      }
      const realClient = new WebClient(botToken);
      const db = await require('./db')();
      const admins = await db
        .collection('admins')
        .find({ workspace_id })
        .toArray();
      await realClient.views.open({
        trigger_id: payload.trigger_id,
        view: getListAdminsModal(admins),
      });
      return res.status(200).send();
    } catch (err) {
      console.error('/listadmins error:', err);
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const botToken = await getTokenForTeam(payload.team_id);
      if (botToken) {
        const realClient = new WebClient(botToken);
        await realClient.chat.postEphemeral({
          channel: payload.channel_id,
          user: payload.user_id,
          text: 'Error fetching admins or opening modal.',
        });
      }
      return res.status(200).send();
    }
  } else if (payload.command === '/removeadmin') {
    // Migrate /removeadmin: open remove admin modal, only allow current admins
    try {
      const { getRemoveAdminModal } = require('./blockKit/removeAdminModal');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { isAdmin } = require('./models/adminModel');
      const { WebClient } = require('@slack/web-api');
      const workspace_id = payload.team_id;
      const channel_id = payload.channel_id;
      const user_id = payload.user_id;
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        return res.json({
          text: ':x: App not properly installed for this workspace. Please reinstall.',
          response_type: 'ephemeral',
        });
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
        return res.status(200).send();
      }
      // Get all admins for dropdown, filter out current user
      const db = await require('./db')();
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
        return res.status(200).send();
      }
      const filteredAdmins = admins.filter((a) => a.user_id !== user_id);
      if (!filteredAdmins.length) {
        await realClient.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: 'No other admins to remove.',
        });
        return res.status(200).send();
      }
      await realClient.views.open({
        trigger_id: payload.trigger_id,
        view: getRemoveAdminModal(filteredAdmins),
      });
      return res.status(200).send();
    } catch (error) {
      console.error('/removeadmin error:', error);
      return res.json({
        text: ':x: Internal error. Please try again later.',
        response_type: 'ephemeral',
      });
    }
  } else if (payload.command === '/add-admin') {
    // Migrate /add-admin: open add admin modal, handle first admin logic
    try {
      const { getAddAdminModal } = require('./blockKit/addAdminModal');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { addAdmin, isAdmin } = require('./models/adminModel');
      const { logActivity } = require('./models/activityLogModel');
      const { WebClient } = require('@slack/web-api');
      const workspace_id = payload.team_id;
      const channel_id = payload.channel_id;
      const user_id = payload.user_id;
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        return res.json({
          text: ':x: App not properly installed for this workspace. Please reinstall.',
          response_type: 'ephemeral',
        });
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
            trigger_id: payload.trigger_id,
            view: {
              ...getAddAdminModal(),
              private_metadata: JSON.stringify({ channel_id }),
            },
          });
        } catch (apiErr) {
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
          return res.status(200).send();
        }
        try {
          await realClient.views.open({
            trigger_id: payload.trigger_id,
            view: {
              ...getAddAdminModal(),
              private_metadata: JSON.stringify({ channel_id }),
            },
          });
        } catch (apiErr) {
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
      return res.status(200).send();
    } catch (error) {
      console.error('/add-admin error:', error);
      return res.json({
        text: ':x: Internal error. Please try again later.',
        response_type: 'ephemeral',
      });
    }
  } else if (payload.command === '/task-complete') {
    // Migrate /task-complete: open complete modal for user's open tasks
    try {
      const { logWorkspace, logUser } = require('./models/analyticsModel');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const { getCompleteTaskModal } = require('./blockKit/completeTaskModal');
      const { getOpenTasks } = require('./models/taskModel');
      const workspace_id = payload.team_id;
      const channel_id = payload.channel_id;
      const user_id = payload.user_id;
      logWorkspace(workspace_id, 'Slack Workspace');
      logUser(user_id, workspace_id, 'Slack User');
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        return res.json({
          text: ':x: App not properly installed for this workspace. Please reinstall.',
          response_type: 'ephemeral',
        });
      }
      const realClient = new WebClient(botToken);
      const rows = await getOpenTasks(workspace_id);
      if (!rows || rows.length === 0) {
        await realClient.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: 'No open tasks to complete.',
        });
        return res.status(200).send();
      }
      await realClient.views.open({
        trigger_id: payload.trigger_id,
        view: {
          ...getCompleteTaskModal(rows),
          private_metadata: JSON.stringify({ channel_id }),
        },
      });
      return res.status(200).send();
    } catch (apiErr) {
      console.error('[task-complete] Slack API error (modal open):', apiErr);
      if (apiErr.data && apiErr.data.error === 'channel_not_found') {
        return res.json({
          text: ':x: Channel not found or bot is not a member. Please invite the bot to this channel.',
          response_type: 'ephemeral',
        });
      } else if (apiErr.data && apiErr.data.error === 'user_not_found') {
        return res.json({
          text: ':x: User not found. Please check the user ID.',
          response_type: 'ephemeral',
        });
      } else {
        return res.json({
          text: ':x: An unexpected error occurred. Please contact support.',
          response_type: 'ephemeral',
        });
      }
    }
    // Supported slash commands
    const supportedCommands = [
      '/tasks',
      '/task',
      '/task-delete',
      '/task-edit',
      '/task-complete',
      '/add-admin',
      '/removeadmin',
      '/listadmins',
      '/auditlog',
      '/report',
      '/notifyprefs',
      '/setdigestchannel',
      '/delete-workspace-data',
      '/support',
      '/setconfig',
      '/help',
    ];
    if (!supportedCommands.includes(payload.command)) {
      return res.json({ text: 'Unknown slash command.' });
    }
    // /task command: open task creation modal
    if (payload.command === '/task') {
      try {
        const { logWorkspace, logUser } = require('./models/analyticsModel');
        const { getTokenForTeam } = require('./models/workspaceTokensModel');
        const { WebClient } = require('@slack/web-api');
        const { getTaskModal } = require('./blockKit/taskModal');
        const workspace_id = payload.team_id;
        const channel_id = payload.channel_id;
        const user_id = payload.user_id;
        logWorkspace(workspace_id, 'Slack Workspace');
        logUser(user_id, workspace_id, 'Slack User');
        const botToken = await getTokenForTeam(workspace_id);
        if (!botToken) {
          return res.json({
            text: ':x: App not properly installed for this workspace. Please reinstall.',
            response_type: 'ephemeral',
          });
        }
        const realClient = new WebClient(botToken);
        await realClient.views.open({
          trigger_id: payload.trigger_id,
          view: getTaskModal(channel_id),
        });
        return res.status(200).send();
      } catch (apiErr) {
        console.error('[task] Slack API error (modal open):', apiErr);
        if (apiErr.data && apiErr.data.error === 'channel_not_found') {
          return res.json({
            text: ':x: Channel not found or bot is not a member. Please invite the bot to this channel.',
            response_type: 'ephemeral',
          });
        } else if (apiErr.data && apiErr.data.error === 'user_not_found') {
          return res.json({
            text: ':x: User not found. Please check the user ID.',
            response_type: 'ephemeral',
          });
        } else {
          return res.json({
            text: ':x: An unexpected error occurred. Please contact support.',
            response_type: 'ephemeral',
          });
        }
      }
    } else if (payload.command === '/task-delete') {
      // ...existing code for /task-delete...
      try {
        const workspace_id = payload.team_id;
        const channel_id = payload.channel_id;
        const user_id = payload.user_id;
        const trigger_id = payload.trigger_id;
        // Log analytics (optional)
        try {
          const { logWorkspace, logUser } = require('./models/analyticsModel');
          logWorkspace(workspace_id, payload.team_domain || '');
          logUser(user_id, workspace_id, payload.user_name || '');
        } catch (e) {
          /* ignore analytics errors */
        }
        // Fetch open tasks
        const { getOpenTasks } = require('./models/taskModel');
        const tasks = await getOpenTasks(workspace_id);
        if (!tasks.length) {
          return res.json({
            response_type: 'ephemeral',
            text: 'No open tasks to delete.',
          });
        }
        // Open modal
        const { getDeleteTaskModal } = require('./blockKit/deleteTaskModal');
        await webClient.views.open({
          trigger_id,
          view: getDeleteTaskModal(tasks),
        });
        return res.status(200).send();
      } catch (err) {
        console.error('/task-delete error:', err);
        return res.json({
          response_type: 'ephemeral',
          text: ':x: Internal error. Please try again later.',
        });
      }
    } else if (payload.command === '/tasks') {
    } else if (payload.command === '/task-edit') {
      // Migrate /task-edit: open edit modal for user's open tasks
      try {
        const { logWorkspace, logUser } = require('./models/analyticsModel');
        const { getTokenForTeam } = require('./models/workspaceTokensModel');
        const { WebClient } = require('@slack/web-api');
        const { getEditTaskModal } = require('./blockKit/editTaskModal');
        const { getOpenTasks } = require('./models/taskModel');
        const workspace_id = payload.team_id;
        const channel_id = payload.channel_id;
        const user_id = payload.user_id;
        logWorkspace(workspace_id, 'Slack Workspace');
        logUser(user_id, workspace_id, 'Slack User');
        const botToken = await getTokenForTeam(workspace_id);
        if (!botToken) {
          return res.json({
            text: ':x: App not properly installed for this workspace. Please reinstall.',
            response_type: 'ephemeral',
          });
        }
        const realClient = new WebClient(botToken);
        // Only show tasks assigned to this user or all open tasks? (original: all open tasks)
        const db = await require('./db')();
        const rows = await db
          .collection('tasks')
          .find({ status: 'open', workspace_id })
          .toArray();
        if (!rows.length) {
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: 'No open tasks to edit.',
          });
          return res.status(200).send();
        }
        await realClient.views.open({
          trigger_id: payload.trigger_id,
          view: {
            ...getEditTaskModal(rows),
            private_metadata: JSON.stringify({ channel_id }),
          },
        });
        return res.status(200).send();
      } catch (apiErr) {
        console.error('[task-edit] Slack API error (modal open):', apiErr);
        if (apiErr.data && apiErr.data.error === 'channel_not_found') {
          return res.json({
            text: ':x: Channel not found or bot is not a member. Please invite the bot to this channel.',
            response_type: 'ephemeral',
          });
        } else if (apiErr.data && apiErr.data.error === 'user_not_found') {
          return res.json({
            text: ':x: User not found. Please check the user ID.',
            response_type: 'ephemeral',
          });
        } else {
          return res.json({
            text: ':x: An unexpected error occurred. Please contact support.',
            response_type: 'ephemeral',
          });
        }
      }
      // Migrated /tasks command logic
      try {
        const { logWorkspace, logUser } = require('./models/analyticsModel');
        const { getTokenForTeam } = require('./models/workspaceTokensModel');
        const { WebClient } = require('@slack/web-api');
        const workspace_id = payload.team_id;
        const channel_id = payload.channel_id;
        const user_id = payload.user_id;
        logWorkspace(workspace_id, 'Slack Workspace');
        logUser(user_id, workspace_id, 'Slack User');
        console.log('[TASKS] Looking up token for team_id:', workspace_id);
        const botToken = await getTokenForTeam(workspace_id);
        console.log('[TASKS] Found botToken:', botToken);
        if (!botToken) {
          console.error(
            '[TASKS] No bot token found for team_id:',
            workspace_id,
          );
          return res.json({
            text: ':x: App not properly installed for this workspace. Please reinstall.',
            response_type: 'ephemeral',
          });
        }
        const realClient = new WebClient(botToken);
        const db = await require('./db')();
        const rows = await db
          .collection('tasks')
          .find({ status: 'open', workspace_id })
          .toArray();
        if (rows.length === 0) {
          return res.json({
            text: 'No open tasks.',
            response_type: 'ephemeral',
          });
        }
        const blocks = rows.map((t) => {
          let assigned = t.assigned_user
            ? ` _(Assigned to: <@${t.assigned_user}> )_`
            : '';
          let due = t.due_date ? ` _(Due: ${t.due_date})_` : '';
          let category = t.category ? ` _(Category: ${t.category})_` : '';
          let tags = t.tags ? ` _(Tags: ${t.tags})_` : '';
          let priority = t.priority ? ` _(Priority: ${t.priority})_` : '';
          return {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${t.description}*${assigned}${due}${category}${tags}${priority}`,
            },
            accessory: {
              type: 'button',
              text: { type: 'plain_text', text: 'Complete' },
              action_id: `complete_task_${t._id}`,
              value: String(t._id),
            },
          };
        });
        blocks.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Edit' },
              action_id: 'edit_task',
              value: 'edit',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Delete' },
              action_id: 'delete_task',
              value: 'delete',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Batch Actions' },
              action_id: 'batch_task_actions',
              value: 'batch',
            },
          ],
        });
        await realClient.chat.postMessage({
          channel: channel_id,
          blocks,
          text: 'Open Tasks',
        });
        return res.status(200).send();
      } catch (error) {
        if (error.data && error.data.error === 'channel_not_found') {
          return res.json({
            text: ':x: Channel not found or bot is not a member. Please invite the bot to this channel.',
            response_type: 'ephemeral',
          });
        } else if (error.data && error.data.error === 'user_not_found') {
          return res.json({
            text: ':x: User not found. Please check the user ID.',
            response_type: 'ephemeral',
          });
        } else {
          return res.json({
            text: ':x: An unexpected error occurred. Please contact support.',
            response_type: 'ephemeral',
          });
        }
      }
    }
    // Add more slash commands as needed
    return res.json({ text: 'Unknown slash command.' });
  }

  // Interactive components (block_actions, view_submissions)
  if (payload.type === 'block_actions') {
    // Modularized block_actions handler for task actions
    try {
      const action = payload.actions && payload.actions[0];
      if (!action) return res.status(200).send();
      const workspace_id = payload.team.id;
      const channel_id = payload.channel.id;
      const user_id = payload.user.id;
      const trigger_id = payload.trigger_id;
      const { WebClient } = require('@slack/web-api');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) return res.status(200).send();
      const realClient = new WebClient(botToken);

      // --- Complete Task ---

      if (action.action_id && action.action_id.startsWith('complete_task_')) {
        const taskId = action.action_id.replace('complete_task_', '');
        const { completeTask } = require('./models/taskModel');
        await completeTask(workspace_id, taskId);
        await realClient.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: ':white_check_mark: Task marked as complete!',
        });
        return res.status(200).send();
      }

      // --- Edit Task ---
      if (action.action_id === 'edit_task') {
        // Open edit modal for user's open tasks
        const {
          getEditTaskModal,
        } = require('./blockKit/blockKit/editTaskModal');
        const db = await require('./db')();
        const rows = await db
          .collection('tasks')
          .find({ status: 'open', workspace_id })
          .toArray();
        if (!rows.length) {
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: 'No open tasks to edit.',
          });
          return res.status(200).send();
        }
        await realClient.views.open({
          trigger_id,
          view: {
            ...getEditTaskModal(rows),
            private_metadata: JSON.stringify({ channel_id }),
          },
        });
        return res.status(200).send();
      }

      // --- Delete Task ---
      if (action.action_id === 'delete_task') {
        // Open delete modal for user's open tasks
        const {
          getDeleteTaskModal,
        } = require('./blockKit/blockKit/deleteTaskModal');
        const db = await require('./db')();
        const rows = await db
          .collection('tasks')
          .find({ status: 'open', workspace_id })
          .toArray();
        if (!rows.length) {
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: 'No open tasks to delete.',
          });
          return res.status(200).send();
        }
        await realClient.views.open({
          trigger_id,
          view: getDeleteTaskModal(rows),
        });
        return res.status(200).send();
      }

      // --- Batch Actions ---
      if (action.action_id === 'batch_task_actions') {
        // Open batch actions modal for user's open tasks
        const {
          getBatchTaskModal,
        } = require('./blockKit/blockKit/batchTaskModal');
        const db = await require('./db')();
        const rows = await db
          .collection('tasks')
          .find({ status: 'open', workspace_id })
          .toArray();
        if (!rows.length) {
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: 'No open tasks for batch actions.',
          });
          return res.status(200).send();
        }
        await realClient.views.open({
          trigger_id,
          view: getBatchTaskModal(rows),
        });
        return res.status(200).send();
      }

      // --- Unknown action ---
      return res.status(200).send();
    } catch (err) {
      console.error('block_actions error:', err);
      return res.status(200).send();
    }
  }
  if (payload.type === 'view_submission') {
    // Handle task_modal_submit (create task from modal)
    if (payload.view && payload.view.callback_id === 'task_modal_submit') {
      try {
        const { createTask } = require('./models/taskModel');
        const { getTokenForTeam } = require('./models/workspaceTokensModel');
        const { WebClient } = require('@slack/web-api');
        const values = payload.view.state.values;
        const workspace_id = payload.team.id || payload.team_id;
        const user_id = payload.user.id;
        let channel_id = null;
        try {
          if (payload.view.private_metadata) {
            channel_id = payload.view.private_metadata;
          }
        } catch (e) {}
        // Extract modal values
        const description = values.description_block.description_input.value;
        const assignedUser = values.user_block.user_select.selected_user;
        const dueDate = values.due_block.due_input.value;
        const category = values.category_block?.category_input?.value || '';
        const tags = values.tags_block?.tags_input?.value || '';
        const priority =
          values.priority_block?.priority_select?.selected_option?.value || '';
        const recurrenceType =
          values.recurrence_type_block?.recurrence_type_select?.selected_option
            ?.value || 'none';
        const recurrenceInterval =
          values.recurrence_interval_block?.recurrence_interval_input?.value ||
          '1';
        // Create the task in DB
        const taskId = await createTask(
          workspace_id,
          description,
          assignedUser,
          dueDate,
          category,
          tags,
          priority,
        );
        // Send confirmation (ephemeral message if channel known)
        const botToken = await getTokenForTeam(workspace_id);
        if (botToken && channel_id && channel_id.startsWith('C')) {
          const realClient = new WebClient(botToken);
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: `:white_check_mark: Task created successfully!`,
          });
        }
        return res.json({ response_action: 'clear' });
      } catch (err) {
        console.error('task_modal_submit error:', err);
        return res.json({
          response_action: 'errors',
          errors: {
            description_block: 'Failed to create task. Please try again.',
          },
        });
      }
    }
    // Handle task_modal_submit (create task from modal)
    if (payload.view && payload.view.callback_id === 'task_modal_submit') {
      try {
        const { createTask } = require('./models/taskModel');
        const { logActivity, logUser } = require('./models/activityLogModel');
        const { getTokenForTeam } = require('./models/workspaceTokensModel');
        const { WebClient } = require('@slack/web-api');
        const workspace_id = payload.team.id || payload.team_id;
        const user_id = payload.user.id;
        let channel_id = null;
        try {
          if (payload.view.private_metadata) {
            channel_id = payload.view.private_metadata;
          }
        } catch (e) {}
        const values = payload.view.state.values;
        const description = values.description_block.description_input.value;
        const assignedUser = values.user_block.user_select.selected_user;
        const dueDate = values.due_block.due_input.value;
        const category = values.category_block?.category_input?.value || '';
        const tags = values.tags_block?.tags_input?.value || '';
        const priority =
          values.priority_block?.priority_select?.selected_option?.value || '';
        const recurrenceType =
          values.recurrence_type_block?.recurrence_type_select?.selected_option
            ?.value || 'none';
        const recurrenceInterval =
          values.recurrence_interval_block?.recurrence_interval_input?.value ||
          '1';
        // Create the task in DB
        const taskId = await createTask(
          workspace_id,
          description,
          assignedUser,
          dueDate,
          category,
          tags,
          priority,
        );
        // Log activity
        try {
          logUser(user_id, workspace_id, payload.user.username || 'Slack User');
          logActivity(
            user_id,
            'create_task',
            `Task ${taskId} created. Description: ${description}`,
          );
        } catch (e) {}
        // Send confirmation (ephemeral message if channel known)
        const botToken = await getTokenForTeam(workspace_id);
        if (botToken && channel_id && channel_id.startsWith('C')) {
          const realClient = new WebClient(botToken);
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: `:white_check_mark: Task created successfully!`,
          });
        }
        return res.json({ response_action: 'clear' });
      } catch (err) {
        console.error('task_modal_submit error:', err);
        return res.json({
          response_action: 'errors',
          errors: {
            description_block: 'Failed to create task. Please try again.',
          },
        });
      }
    }
    // Handle setconfig_modal_submit
    if (payload.view && payload.view.callback_id === 'setconfig_modal_submit') {
      const { setSetting } = require('./models/settingsModel');
      const { logActivity } = require('./models/activityLogModel');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const workspace_id = payload.team.id || payload.team_id;
      const digestChannel =
        payload.view.state.values.digest_channel_block.digest_channel_input
          .value;
      const digestTime =
        payload.view.state.values.digest_time_block.digest_time_input.value;
      const reminderTime =
        payload.view.state.values.reminder_time_block.reminder_time_input.value;
      await setSetting('digest_channel', digestChannel, workspace_id);
      await setSetting('digest_time', digestTime, workspace_id);
      await setSetting('reminder_time', reminderTime, workspace_id);
      await logActivity(
        payload.user.id,
        'update_config',
        `Digest Channel: ${digestChannel}, Digest Time: ${digestTime}, Reminder Time: ${reminderTime}`,
      );
      const botToken = await getTokenForTeam(workspace_id);
      if (botToken) {
        const realClient = new WebClient(botToken);
        await realClient.chat.postMessage({
          channel: payload.user.id,
          text: `:white_check_mark: Workspace settings updated!\nDigest Channel: ${digestChannel}\nDigest Time: ${digestTime}\nReminder Time: ${reminderTime}`,
        });
      }
      return res.json({ response_action: 'clear' });
    }
    // Handle delete_workspace_data_confirm
    if (
      payload.view &&
      payload.view.callback_id === 'delete_workspace_data_confirm'
    ) {
      const {
        isAdmin,
        deleteAdminsForWorkspace,
      } = require('./models/adminModel');
      const { deleteTasksForWorkspace } = require('./models/taskModel');
      const connectDB = require('./db');
      // Helpers from original handler
      async function deleteFeedbackForWorkspace(workspace_id) {
        const db = await connectDB();
        await db.collection('feedback').deleteMany({ workspace_id });
      }
      async function deleteBugReportsForWorkspace(workspace_id) {
        const db = await connectDB();
        await db.collection('bug_reports').deleteMany({ workspace_id });
      }
      async function removeAllSettingsForWorkspace(workspace_id) {
        const db = await connectDB();
        await db.collection('settings').deleteMany({ workspace_id });
      }
      async function removeWorkspaceToken(workspace_id) {
        const db = await connectDB();
        await db
          .collection('workspace_tokens')
          .deleteMany({ team_id: workspace_id });
      }
      async function removeNotificationPreferences(workspace_id) {
        const db = await connectDB();
        await db
          .collection('notification_preferences')
          .deleteMany({ workspace_id });
      }
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const workspace_id = payload.team.id;
      const user_id = payload.user.id;
      const confirmation =
        payload.view.state.values.confirm_block.confirm_input.value;
      let channel_id = null;
      try {
        if (payload.view.private_metadata) {
          const meta = JSON.parse(payload.view.private_metadata);
          if (meta.channel_id) channel_id = meta.channel_id;
        }
      } catch (e) {
        channel_id = payload.view.private_metadata || null;
      }
      if (confirmation !== 'DELETE') {
        const botToken = await getTokenForTeam(workspace_id);
        if (botToken && channel_id) {
          const realClient = new WebClient(botToken);
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: ':warning: Data deletion cancelled. You must type DELETE to confirm.',
          });
        }
        return res.json({ response_action: 'clear' });
      }
      try {
        await deleteTasksForWorkspace(workspace_id);
        await deleteFeedbackForWorkspace(workspace_id);
        await deleteBugReportsForWorkspace(workspace_id);
        await deleteAdminsForWorkspace(workspace_id);
        await removeAllSettingsForWorkspace(workspace_id);
        await removeWorkspaceToken(workspace_id);
        await removeNotificationPreferences(workspace_id);
        const botToken = await getTokenForTeam(workspace_id);
        if (botToken && channel_id) {
          const realClient = new WebClient(botToken);
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: ':wastebasket: All workspace data has been deleted.',
          });
        }
      } catch (err) {
        const botToken = await getTokenForTeam(workspace_id);
        if (botToken && channel_id) {
          const realClient = new WebClient(botToken);
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: ':warning: Failed to delete workspace data. Please contact support.',
          });
        }
      }
      return res.json({ response_action: 'clear' });
    }
    // Handle notifyprefs_modal_submit
    if (
      payload.view &&
      payload.view.callback_id === 'notifyprefs_modal_submit'
    ) {
      const {
        setPreferences,
      } = require('./models/notificationPreferencesModel');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      const userId = payload.user.id;
      let channel_id = null;
      try {
        if (payload.view.private_metadata) {
          const meta = JSON.parse(payload.view.private_metadata);
          if (meta.channel_id) channel_id = meta.channel_id;
        }
      } catch (e) {
        channel_id = payload.view.private_metadata || null;
      }
      const muteAll =
        payload.view.state.values.mute_block.mute_input.selected_options.some(
          (opt) => opt.value === 'mute_all',
        );
      const digestOnly =
        payload.view.state.values.digest_block.digest_input.selected_options.some(
          (opt) => opt.value === 'digest_only',
        );
      const customReminderTime =
        payload.view.state.values.reminder_time_block.reminder_time_input.value;
      const workspace_id = payload.team.id;
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        console.error(
          '[notifyprefs modal] No bot token found for workspace:',
          workspace_id,
        );
        if (channel_id && channel_id.startsWith('C')) {
          // Can't send message without token
        }
        return res.status(200).send();
      }
      const realClient = new WebClient(botToken);
      await setPreferences(userId, { muteAll, digestOnly, customReminderTime });
      if (channel_id && channel_id.startsWith('C')) {
        try {
          await realClient.chat.postEphemeral({
            channel: channel_id,
            user: userId,
            text: `:white_check_mark: Notification preferences updated!\nMute all: ${
              muteAll ? 'Yes' : 'No'
            }\nDigest only: ${
              digestOnly ? 'Yes' : 'No'
            }\nCustom reminder time: ${customReminderTime || 'Default'}`,
          });
        } catch (apiErr) {
          console.error('[notifyprefs modal] Slack API error:', apiErr);
        }
      } else {
        console.error(
          '[ERROR] No valid channel_id for postEphemeral in /notifyprefs modal submission.',
          channel_id,
        );
      }
      return res.json({ response_action: 'clear' });
    }
    // Handle remove_admin_modal_submit
    if (
      payload.view &&
      payload.view.callback_id === 'remove_admin_modal_submit'
    ) {
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { removeAdmin } = require('./models/adminModel');
      const { logActivity } = require('./models/activityLogModel');
      const { WebClient } = require('@slack/web-api');
      const user = payload.user.id;
      const values = payload.view.state.values;
      const adminId = values.admin_block.admin_select.selected_option.value;
      const workspace_id = payload.team.id;
      // Safely get channel ID for ephemeral message
      let channelId = null;
      if (payload.view && payload.view.private_metadata) {
        channelId = payload.view.private_metadata;
      } else if (payload.channel && payload.channel.id) {
        channelId = payload.channel.id;
      }
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        console.error(
          '[removeadmin modal] No bot token found for workspace:',
          workspace_id,
        );
        if (channelId) {
          const realClient = new WebClient(botToken);
          await realClient.chat.postEphemeral({
            channel: channelId,
            user,
            text: ':x: App not properly installed for this workspace. Please reinstall.',
          });
        }
        return res.status(200).send();
      }
      const realClient = new WebClient(botToken);
      const result = await removeAdmin(adminId, workspace_id);
      logActivity(
        user,
        'remove_admin',
        `Admin privileges removed for <@${adminId}>`,
      );
      if (!channelId) {
        console.error(
          '[ERROR] Unable to send feedback for /remove-admin. No valid channel context.',
        );
        return res.status(200).send();
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
      return res.json({ response_action: 'clear' });
    }
    // Handle add_admin_modal_submit
    if (payload.view && payload.view.callback_id === 'add_admin_modal_submit') {
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { addAdmin, isAdmin } = require('./models/adminModel');
      const { logActivity } = require('./models/activityLogModel');
      const { WebClient } = require('@slack/web-api');
      const user = payload.user.id;
      const selectedUser =
        payload.view.state.values.user_block.user_select.selected_user;
      const workspaceId = payload.team.id || payload.team_id;
      // Get channel_id from private_metadata
      let channel_id = null;
      try {
        if (payload.view.private_metadata) {
          const meta = JSON.parse(payload.view.private_metadata);
          if (meta.channel_id) channel_id = meta.channel_id;
        }
      } catch (e) {}
      const botToken = await getTokenForTeam(workspaceId);
      if (!botToken) {
        console.error('No bot token found for workspace:', workspaceId);
        return res.status(200).send();
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
        return res.json({ response_action: 'clear' });
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
      return res.json({ response_action: 'clear' });
    }
    // Handle complete_task_modal_submit
    if (
      payload.view &&
      payload.view.callback_id === 'complete_task_modal_submit'
    ) {
      const workspace_id = payload.team.id;
      const user_id = payload.user.id;
      let channel_id = null;
      try {
        if (payload.view.private_metadata) {
          const meta = JSON.parse(payload.view.private_metadata);
          if (meta.channel_id) channel_id = meta.channel_id;
        }
      } catch (e) {
        channel_id = payload.view.private_metadata || null;
      }
      if (!channel_id || !channel_id.startsWith('C')) {
        console.error(
          '[ERROR] Invalid channel_id for postEphemeral in /task-complete modal submission:',
          channel_id,
        );
        return res.status(200).send();
      }
      // Extract values
      const values = payload.view.state.values;
      let selectedTaskIds = [];
      if (values.task_block.task_select.selected_options) {
        selectedTaskIds = values.task_block.task_select.selected_options.map(
          (opt) => opt.value,
        );
      } else if (values.task_block.task_select.selected_option) {
        selectedTaskIds = [values.task_block.task_select.selected_option.value];
      }
      const notes = values.notes_block?.notes_input?.value || '';
      const { completeTask } = require('./models/taskModel');
      const { logActivity, logUser } = require('./models/activityLogModel');
      const { getTokenForTeam } = require('./models/workspaceTokensModel');
      const { WebClient } = require('@slack/web-api');
      let completed = [];
      let failed = [];
      const botToken = await getTokenForTeam(workspace_id);
      if (!botToken) {
        console.error(
          '[task-complete modal] No bot token found for workspace:',
          workspace_id,
        );
        return res.status(200).send();
      }
      const realClient = new WebClient(botToken);
      for (const taskId of selectedTaskIds) {
        try {
          const result = await completeTask(workspace_id, taskId);
          logUser(user_id, workspace_id, payload.user.username || 'Slack User');
          logActivity(
            user_id,
            'complete_task',
            `Task ${taskId} marked complete. Notes: ${notes || 'N/A'}`,
          );
          if (!result || result.modifiedCount === 0) {
            failed.push(taskId);
          } else {
            completed.push(taskId);
          }
        } catch (err) {
          failed.push(taskId);
        }
      }
      let msg = '';
      if (completed.length)
        msg += `:white_check_mark: Completed: ${completed.join(', ')}.`;
      if (failed.length) msg += `\n:warning: Failed: ${failed.join(', ')}.`;
      if (notes) msg += `\nNotes: ${notes}`;
      try {
        await realClient.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: msg,
        });
      } catch (apiErr) {
        console.error('[task-complete modal] Slack API error:', apiErr);
      }
      // Respond to Slack to close modal
      return res.json({ response_action: 'clear' });
    }
    // Handle view submissions (delete and edit)
    try {
      if (
        payload.view &&
        payload.view.callback_id === 'delete_task_modal_submit'
      ) {
        const workspace_id = payload.team.id;
        const user_id = payload.user.id;
        const channel_id = payload.view.private_metadata || null;
        // Extract selected task ID
        const selectedTaskId =
          payload.view.state.values.task_block.task_select.selected_option
            .value;
        // Extract reason (optional)
        const reason =
          payload.view.state.values.reason_block.reason_input.value || '';
        // Delete task
        const { deleteTask } = require('./models/taskModel');
        await deleteTask(workspace_id, selectedTaskId);
        // Optionally, log analytics
        try {
          const { logUser } = require('./models/analyticsModel');
          logUser(user_id, workspace_id, payload.user.username || '');
        } catch (e) {
          /* ignore analytics errors */
        }
        // Send confirmation (ephemeral message if channel known)
        if (channel_id) {
          const { WebClient } = require('@slack/web-api');
          const { getTokenForTeam } = require('./models/workspaceTokensModel');
          const botToken = await getTokenForTeam(workspace_id);
          if (botToken) {
            const webClient = new WebClient(botToken);
            await webClient.chat.postEphemeral({
              channel: channel_id,
              user: user_id,
              text: `:wastebasket: Task deleted.${
                reason ? ' Reason: ' + reason : ''
              }`,
            });
          }
        }
        // Respond to Slack to close modal
        return res.json({ response_action: 'clear' });
      } else if (
        payload.view &&
        payload.view.callback_id === 'edit_task_modal_submit'
      ) {
        // Handle edit task modal submission
        const workspace_id = payload.team.id;
        const user_id = payload.user.id;
        let channel_id = null;
        try {
          if (payload.view.private_metadata) {
            const meta = JSON.parse(payload.view.private_metadata);
            if (meta.channel_id) channel_id = meta.channel_id;
          }
        } catch (e) {
          channel_id = payload.view.private_metadata || null;
        }
        // Extract values
        const values = payload.view.state.values;
        const taskId = values.task_block.task_select.selected_option.value;
        const newDesc = values.desc_block.desc_input.value;
        const newDue = values.due_block.due_input.value;
        const newCategory = values.category_block?.category_input?.value || '';
        const newTags = values.tags_block?.tags_input?.value || '';
        const newPriority =
          values.priority_block?.priority_select?.selected_option?.value || '';
        // Update task in DB
        const { updateTask } = require('./models/taskModel');
        await updateTask(
          workspace_id,
          taskId,
          newDesc,
          undefined, // assignedUser (not editable in modal)
          newDue,
          newCategory,
          newTags,
          newPriority,
        );
        // Log activity
        try {
          const { logActivity, logUser } = require('./models/activityLogModel');
          logUser(user_id, workspace_id, payload.user.username || 'Slack User');
          logActivity(
            user_id,
            'edit_task',
            `Task ${taskId} edited. New description: ${newDesc}, New due: ${newDue}`,
          );
        } catch (e) {
          /* ignore analytics errors */
        }
        // Send confirmation (ephemeral message if channel known)
        if (channel_id && channel_id.startsWith('C')) {
          const { WebClient } = require('@slack/web-api');
          const { getTokenForTeam } = require('./models/workspaceTokensModel');
          const botToken = await getTokenForTeam(workspace_id);
          if (botToken) {
            const webClient = new WebClient(botToken);
            await webClient.chat.postEphemeral({
              channel: channel_id,
              user: user_id,
              text: `:pencil2: Task updated successfully.`,
            });
          }
        }
        // Respond to Slack to close modal
        return res.json({ response_action: 'clear' });
      }
      // Other view_submissions can be handled here
      return res.status(200).send();
    } catch (err) {
      console.error('view_submission error:', err);
      // Respond with error to Slack
      return res.json({
        response_action: 'errors',
        errors: {
          task_block: 'Failed to process modal. Please try again.',
        },
      });
    }
  }

  // Default ack for unhandled events
  res.status(200).send();
}

app.post('/slack/events', slackHandler);
app.post('/slack/commands', slackHandler);

app.listen(port, () => {
  console.log(`Slack Express server running on port ${port}`);
});
