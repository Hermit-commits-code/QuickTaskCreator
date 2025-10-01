// Quick Task Creator main entry
const { App } = require("@slack/bolt");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
require("dotenv").config();

// Load environment variables (use dotenv in future)
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
});

// Initialize Slack Bolt app
const app = new App({
  signingSecret: SLACK_SIGNING_SECRET,
  token: SLACK_BOT_TOKEN,
  socketMode: false,
  appToken: process.env.SLACK_APP_TOKEN, // optional for socket mode
});
// Minimal test command for Block Kit buttons
app.command("/testbuttons", async ({ ack, client, body }) => {
  await ack();
  await client.chat.postMessage({
    channel: body.channel_id,
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
  let description = command.text.trim();
  if (!description) {
    await respond({
      text: "Please provide a task description.",
      response_type: "ephemeral",
    });
    return;
  }
  // Parse for Slack user mention (e.g., <@U123456>)
  const mentionMatch = description.match(/<@([A-Z0-9]+)>/);
  let assignedUser = null;
  if (mentionMatch) {
    assignedUser = mentionMatch[1];
    description = description.replace(mentionMatch[0], "").trim();
  }
  db.run(
    `INSERT INTO tasks (description, assigned_user) VALUES (?, ?)`,
    [description, assignedUser],
    function (err) {
      if (err) {
        respond({
          text: `Error creating task: ${err.message}`,
          response_type: "ephemeral",
        });
      } else {
        let assignedText = assignedUser
          ? ` (Assigned to: <@${assignedUser}>)`
          : "";
        client.chat
          .postMessage({
            channel: body.channel_id,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `:memo: *Task Created*: ${description}${assignedText}`,
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
          })
          .catch((e) => {
            respond({
              text: `Error sending Block Kit message: ${e.message}`,
              response_type: "ephemeral",
            });
          });
      }
    }
  );
});

// Register /tasks slash command
app.command("/tasks", async ({ ack, respond }) => {
  await ack();
  db.all(
    `SELECT id, description, status, assigned_user FROM tasks WHERE status = 'open'`,
    [],
    (err, rows) => {
      if (err) {
        respond({ text: "Error fetching tasks.", response_type: "ephemeral" });
      } else if (rows.length === 0) {
        respond({ text: "No open tasks.", response_type: "ephemeral" });
      } else {
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
      }
    }
  );
});

// Register /task-edit slash command
app.command("/task-edit", async ({ command, ack, respond }) => {
  await ack();
  const [id, ...descParts] = command.text.trim().split(" ");
  let newDesc = descParts.join(" ").trim();
  if (!id || !newDesc) {
    respond({
      text: "Usage: /task-edit <task id> <new description> [@user]",
      response_type: "ephemeral",
    });
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
          text: "Error editing task or task not found.",
          response_type: "ephemeral",
        });
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
      text: "Usage: /task-complete <task id>",
      response_type: "ephemeral",
    });
    return;
  }
  db.run(
    `UPDATE tasks SET status = 'complete' WHERE id = ?`,
    [id],
    function (err) {
      if (err || this.changes === 0) {
        respond({
          text: "Error completing task or task not found.",
          response_type: "ephemeral",
        });
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
app.command("/task-delete", async ({ command, ack, respond }) => {
  await ack();
  const id = command.text.trim();
  if (!id) {
    respond({
      text: "Usage: /task-delete <task id>",
      response_type: "ephemeral",
    });
    return;
  }
  db.run(`DELETE FROM tasks WHERE id = ?`, [id], function (err) {
    if (err || this.changes === 0) {
      respond({
        text: "Error deleting task or task not found.",
        response_type: "ephemeral",
      });
    } else {
      respond({ text: `:x: Task ${id} deleted.`, response_type: "in_channel" });
    }
  });
});

// Export for testing
module.exports = { app, db };
