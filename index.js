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
app.command("/task", async ({ command, ack, respond }) => {
  await ack();
  const description = command.text.trim();
  if (!description) {
    await respond({
      text: "Please provide a task description.",
      response_type: "ephemeral",
    });
    return;
  }
  // Insert into DB
  db.run(
    `INSERT INTO tasks (description) VALUES (?)`,
    [description],
    function (err) {
      if (err) {
        respond({ text: "Error creating task.", response_type: "ephemeral" });
      } else {
        respond({
          text: `:memo: *Task Created*: ${description}`,
          response_type: "in_channel",
        });
      }
    }
  );
});

// Register /tasks slash command
app.command("/tasks", async ({ ack, respond }) => {
  await ack();
  db.all(
    `SELECT id, description, status FROM tasks WHERE status = 'open'`,
    [],
    (err, rows) => {
      if (err) {
        respond({ text: "Error fetching tasks.", response_type: "ephemeral" });
      } else if (rows.length === 0) {
        respond({ text: "No open tasks.", response_type: "ephemeral" });
      } else {
        const tasksList = rows
          .map((t) => `• *${t.id}*: ${t.description}`)
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
  const newDesc = descParts.join(" ").trim();
  if (!id || !newDesc) {
    respond({
      text: "Usage: /task-edit <task id> <new description>",
      response_type: "ephemeral",
    });
    return;
  }
  db.run(
    `UPDATE tasks SET description = ? WHERE id = ?`,
    [newDesc, id],
    function (err) {
      if (err || this.changes === 0) {
        respond({
          text: "Error editing task or task not found.",
          response_type: "ephemeral",
        });
      } else {
        respond({
          text: `:pencil2: Task ${id} updated.`,
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
