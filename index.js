// Quick Task Creator main entry
const { App } = require("@slack/bolt");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
require("dotenv").config();

// Load environment variables
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const PORT = process.env.PORT || 3000;

// Initialize SQLite DB
const db = new sqlite3.Database("./tasks.db");
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    assigned_user TEXT,
    due_date TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    user_id TEXT PRIMARY KEY
  )`);
});

// ...existing code...
// Initialize Slack Bolt app
const app = new App({
  signingSecret: SLACK_SIGNING_SECRET,
  token: SLACK_BOT_TOKEN,
  socketMode: false,
  appToken: process.env.SLACK_APP_TOKEN, // optional for socket mode
});

// Register admin command handlers (after app is initialized)
const registerAdminHandlers = require("./handlers/admin");
registerAdminHandlers(app, db);
// In-memory config for digest channel (persist to DB for production)
let digestChannelId = process.env.TASKS_CHANNEL_ID;

// Slash command to set daily digest channel
app.command("/setdigestchannel", async ({ command, ack, respond, body }) => {
  await ack();
  const userId = body.user_id;
  isAdmin(userId, (isUserAdmin) => {
    if (!isUserAdmin) {
      respond({
        text: "❗ Only admins can set the daily digest channel.",
        response_type: "ephemeral",
      });
      return;
    }
    const channelId = command.text.trim();
    if (!channelId.match(/^C[A-Z0-9]+$/)) {
      respond({
        text: "Please provide a valid Slack channel ID (e.g., C12345678).",
        response_type: "ephemeral",
      });
      return;
    }
    digestChannelId = channelId;
    respond({
      text: `Daily digest channel set to <#${channelId}>`,
      response_type: "ephemeral",
    });
  });
});
// Daily digest dependencies
const cron = require("node-cron");

// Daily digest: send open tasks to Slack channel at 9am
cron.schedule("0 9 * * *", async () => {
  try {
    db.all(`SELECT * FROM tasks WHERE status = 'open'`, async (err, rows) => {
      if (err) return;
      if (!rows.length) return;
      const blocks = [
        {
          type: "header",
          text: { type: "plain_text", text: "Daily Task Digest" },
        },
      ];
      rows.forEach((task) => {
        let assigned = task.assigned_user
          ? ` (Assigned: <@${task.assigned_user}>)`
          : "";
        let due = task.due_date ? ` (Due: ${task.due_date})` : "";
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${task.description}*${assigned}${due}`,
          },
        });
      });
      await app.client.chat.postMessage({
        channel: digestChannelId,
        text: "Daily Task Digest",
        blocks,
      });
    });
  } catch (e) {
    // Optionally log error
  }
});
// Minimal test command for Block Kit buttons
app.command("/testbuttons", async ({ ack, client, body }) => {
  await ack();
  await client.chat.postMessage({
    channel: body.channel_id,
    text: "Test Block Kit Buttons",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Test Block Kit Buttons",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Button 1" },
            value: "test1",
            action_id: "test_button_1",
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Button 2" },
            value: "test2",
            action_id: "test_button_2",
          },
        ],
      },
    ],
  });
});

// Handle Slack message shortcut: Create Task
app.shortcut("create_task", async ({ shortcut, ack, client, respond }) => {
  await ack();
  const messageText = shortcut.message.text;
  db.run(
    `INSERT INTO tasks (description) VALUES (?)`,
    [messageText],
    function (err) {
      if (err) {
        respond &&
          respond({
            text: "Error creating task from message.",
            response_type: "ephemeral",
          });
      } else {
        client.chat.postMessage({
          channel: process.env.TASKS_CHANNEL_ID || shortcut.channel.id,
          text: `Task Created from message: ${messageText}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `:memo: *Task Created from message*: ${messageText}`,
              },
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: { type: "plain_text", text: "✅ Complete" },
                  style: "primary",
                  value: String(this.lastID),
                  action_id: "task_complete",
                },
                {
                  type: "button",
                  text: { type: "plain_text", text: "📝 Edit" },
                  value: String(this.lastID),
                  action_id: "task_edit",
                },
                {
                  type: "button",
                  text: { type: "plain_text", text: "❌ Delete" },
                  style: "danger",
                  value: String(this.lastID),
                  action_id: "task_delete",
                },
              ],
            },
          ],
        });
      }
    }
  );
});

// Express server for health check

const server = express();
server.use(express.json());
server.get("/", (req, res) => res.send("Quick Task Creator is running."));

// Start Slack Bolt app (handles events and commands automatically)
(async () => {
  await app.start(PORT);
  console.log(`⚡️ Slack Bolt app is running on port ${PORT}`);
})();

// Register /task slash command
app.command("/task", async ({ command, ack, client, body, respond }) => {
  await ack();
  db.all(`SELECT * FROM tasks WHERE status = 'open'`, (err, rows) => {
    if (err) {
      respond({ text: "Error fetching tasks.", response_type: "ephemeral" });
      return;
    }
    if (rows.length === 0) {
      respond({ text: "No open tasks.", response_type: "ephemeral" });
      return;
    }
    const tasksList = rows
      .map((t) => {
        let assigned = t.assigned_user
          ? ` _(Assigned to: <@${t.assigned_user}> )_`
          : "";
        return `• *${t.id}*: ${t.description}${assigned}`;
      })
      .join("\n");
    respond({
      text: `*Open Tasks:*
${tasksList}`,
      response_type: "in_channel",
    });
  });
});

// Register /task-edit slash command
app.command("/task-edit", async ({ command, ack, respond }) => {
  await ack();
  const [id, ...descParts] = command.text.trim().split(" ");
  let newDesc = descParts.join(" ").trim();
  if (!id || !newDesc) {
    respond({
      text: "❗ Usage: /task-edit <task id> <new description> [@user]",
      response_type: "ephemeral",
    });
    console.error("[ERROR] /task-edit: Missing task ID or description.");
    return;
  }
  // Parse for Slack user mention
  const mentionMatch = newDesc.match(/<@([A-Z0-9]+)>/);
  let assignedUser = null;
  if (mentionMatch) {
    assignedUser = mentionMatch[1];
    newDesc = newDesc.replace(mentionMatch[0], "").trim();
  }
  db.run(
    `UPDATE tasks SET description = ?, assigned_user = ? WHERE id = ?`,
    [newDesc, assignedUser, id],
    function (err) {
      if (err || this.changes === 0) {
        respond({
          text: "❗ Failed to edit task. Task not found or database error.",
          response_type: "ephemeral",
        });
        console.error(
          `[ERROR] /task-edit: DB error or task not found. ${
            err ? err.message : ""
          }`
        );
      } else {
        let assignedText = assignedUser
          ? ` (Assigned to: <@${assignedUser}>)`
          : "";
        respond({
          text: `:pencil2: Task ${id} updated.${assignedText}`,
          response_type: "in_channel",
        });
      }
    }
  );
});

// Register /task-complete slash command
app.command("/task-complete", async ({ command, ack, respond }) => {
  await ack();
  const id = command.text.trim();
  if (!id) {
    respond({
      text: "❗ Usage: /task-complete <task id>",
      response_type: "ephemeral",
    });
    console.error("[ERROR] /task-complete: Missing task ID.");
    return;
  }
  db.run(
    `UPDATE tasks SET status = 'complete' WHERE id = ?`,
    [id],
    function (err) {
      if (err || this.changes === 0) {
        respond({
          text: "❗ Failed to complete task. Task not found or database error.",
          response_type: "ephemeral",
        });
        console.error(
          `[ERROR] /task-complete: DB error or task not found. ${
            err ? err.message : ""
          }`
        );
      } else {
        respond({
          text: `:white_check_mark: Task ${id} marked complete.`,
          response_type: "in_channel",
        });
      }
    }
  );
});

// Register /task-delete slash command
app.command("/task-delete", async ({ command, ack, respond, body }) => {
  await ack();
  const userId = body.user_id;
  isAdmin(userId, (isUserAdmin) => {
    if (!isUserAdmin) {
      respond({
        text: "❗ Only admins can delete tasks.",
        response_type: "ephemeral",
      });
      return;
    }
    const id = command.text.trim();
    if (!id) {
      respond({
        text: "❗ Usage: /task-delete <task id>",
        response_type: "ephemeral",
      });
      console.error("[ERROR] /task-delete: Missing task ID.");
      return;
    }
    db.run(`DELETE FROM tasks WHERE id = ?`, [id], function (err) {
      if (err || this.changes === 0) {
        respond({
          text: "❗ Failed to delete task. Task not found or database error.",
          response_type: "ephemeral",
        });
        console.error(
          `[ERROR] /task-delete: DB error or task not found. ${
            err ? err.message : ""
          }`
        );
      } else {
        respond({
          text: `:x: Task ${id} deleted.`,
          response_type: "in_channel",
        });
      }
    });
  });
});

// Export for testing
module.exports = { app, db };
