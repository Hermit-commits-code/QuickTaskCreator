const express = require('express');
const bodyParser = require('body-parser');
const { WebClient } = require('@slack/web-api');
const verifySlackSignature = require('./utils/verifySlackSignature');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const slackBotToken = process.env.SLACK_BOT_TOKEN;
const webClient = new WebClient(slackBotToken);

// Capture raw body for signature verification
app.use((req, res, next) => {
  let data = '';
  req.on('data', (chunk) => {
    data += chunk;
  });
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Slack signature verification middleware
app.use('/slack/events', verifySlackSignature(slackSigningSecret));

// Main Slack events endpoint
app.post('/slack/events', async (req, res) => {
  const payload = req.body;
  // Respond to Slack's URL verification challenge
  if (payload.type === 'url_verification') {
    return res.send({ challenge: payload.challenge });
  }

  // Slash command (form-encoded)
  if (payload.command) {
    if (payload.command === '/task-delete') {
      // Migrate: fetch open tasks and open delete modal
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
});

app.listen(port, () => {
  console.log(`Slack Express server running on port ${port}`);
});
