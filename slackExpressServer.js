const axios = require('axios');
// ...existing code...
const app = express();
// Health check route for deployment debugging
app.get('/', (req, res) => res.send('OK'));
const port = process.env.PORT || 8080;
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const slackBotToken = process.env.SLACK_BOT_TOKEN;

// Slack OAuth redirect route (best-practice)
app.get('/slack/oauth_redirect', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.status(400).send('Slack OAuth failed: ' + error);
  }
const app = express();
  if (!code) {
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
    if (!data.ok) {
      return res
        .status(400)
        .send('Slack OAuth error: ' + (data.error || 'Unknown error'));
    }
    // Store tokens and team info in DB (best-practice: upsert)
    const db = await require('./db')();
    await db.collection('workspaceTokens').updateOne(
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
    return res.send(
      'Slack app installed successfully! You can now use the app in your workspace.',
    );
  } catch (err) {
    console.error('Slack OAuth error:', err);
    return res.status(500).send('Internal server error during Slack OAuth.');
  }
});
const express = require('express');
const bodyParser = require('body-parser');
const { WebClient } = require('@slack/web-api');
const verifySlackSignature = require('./utils/verifySlackSignature');
require('dotenv').config();

const app = express();
// Health check route for deployment debugging
app.get('/', (req, res) => res.send('OK'));
const port = process.env.PORT || 8080;
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const slackBotToken = process.env.SLACK_BOT_TOKEN;
const webClient = new WebClient(slackBotToken);

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
  if (payload.command) {
    if (payload.command === '/task-delete') {
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
    // Handle delete_task button
    try {
      const action =
        payload.actions &&
        payload.actions.find((a) => a.action_id === 'delete_task');
      if (action) {
        const workspace_id = payload.team.id;
        const channel_id = payload.channel.id;
        const user_id = payload.user.id;
        const trigger_id = payload.trigger_id;
        // Log analytics (optional)
        try {
          const { logWorkspace, logUser } = require('./models/analyticsModel');
          logWorkspace(workspace_id, payload.team.domain || '');
          logUser(user_id, workspace_id, payload.user.username || '');
        } catch (e) {
          /* ignore analytics errors */
        }
        // Fetch open tasks
        const { getOpenTasks } = require('./models/taskModel');
        const tasks = await getOpenTasks(workspace_id);
        if (!tasks.length) {
          await webClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: 'No open tasks to delete.',
          });
          return res.status(200).send();
        }
        // Open modal
        const { getDeleteTaskModal } = require('./blockKit/deleteTaskModal');
        await webClient.views.open({
          trigger_id,
          view: getDeleteTaskModal(tasks),
        });
        return res.status(200).send();
      }
      // Other block_actions can be handled here
      return res.status(200).send();
    } catch (err) {
      console.error('block_actions error:', err);
      return res.status(200).send();
    }
  }
  if (payload.type === 'view_submission') {
    // Handle delete_task_modal_submit
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
          await webClient.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: `:wastebasket: Task deleted.${
              reason ? ' Reason: ' + reason : ''
            }`,
          });
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
          task_block: 'Failed to delete task. Please try again.',
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
