// models/taskModel.js
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./tasks.db");

function initTaskTable() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      assigned_user TEXT,
      due_date TEXT,
      category TEXT,
      tags TEXT,
      priority TEXT DEFAULT 'Medium',
      reminder_status TEXT DEFAULT 'pending',
      next_reminder_time TEXT
    )`);
  });
}

function getOpenTasks(workspace_id, callback) {
  db.all(
    `SELECT * FROM tasks WHERE status = 'open' AND workspace_id = ?`,
    [workspace_id],
    callback
  );
}

function createTask(
  workspace_id,
  description,
  assignedUser,
  dueDate,
  category,
  tags,
  priority,
  callback
) {
  db.run(
    `INSERT INTO tasks (workspace_id, description, assigned_user, due_date, category, tags, priority) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      workspace_id,
      description,
      assignedUser,
      dueDate,
      category,
      tags,
      priority,
    ],
    callback
  );
}

function updateTask(
  workspace_id,
  id,
  newDesc,
  assignedUser,
  dueDate,
  category,
  tags,
  priority,
  callback
) {
  db.run(
    `UPDATE tasks SET description = ?, assigned_user = ?, due_date = ?, category = ?, tags = ?, priority = ? WHERE id = ? AND workspace_id = ?`,
    [
      newDesc,
      assignedUser,
      dueDate,
      category,
      tags,
      priority,
      id,
      workspace_id,
    ],
    callback
  );
}

function completeTask(workspace_id, id, callback) {
  db.run(
    `UPDATE tasks SET status = 'complete' WHERE id = ? AND workspace_id = ?`,
    [id, workspace_id],
    callback
  );
}

function deleteTask(id, callback) {
  db.run(
    `DELETE FROM tasks WHERE id = ? AND workspace_id = ?`,
    [id, workspace_id],
    callback
  );
}

module.exports = {
  db,
  initTaskTable,
  getOpenTasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
};
