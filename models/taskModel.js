// models/taskModel.js
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./tasks.db");

function initTaskTable() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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

function getOpenTasks(callback) {
  db.all(`SELECT * FROM tasks WHERE status = 'open'`, callback);
}

function createTask(
  description,
  assignedUser,
  dueDate,
  category,
  tags,
  priority,
  callback
) {
  db.run(
    `INSERT INTO tasks (description, assigned_user, due_date, category, tags, priority) VALUES (?, ?, ?, ?, ?, ?)`,
    [description, assignedUser, dueDate, category, tags, priority],
    callback
  );
}

function updateTask(
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
    `UPDATE tasks SET description = ?, assigned_user = ?, due_date = ?, category = ?, tags = ?, priority = ? WHERE id = ?`,
    [newDesc, assignedUser, dueDate, category, tags, priority, id],
    callback
  );
}

function completeTask(id, callback) {
  db.run(`UPDATE tasks SET status = 'complete' WHERE id = ?`, [id], callback);
}

function deleteTask(id, callback) {
  db.run(`DELETE FROM tasks WHERE id = ?`, [id], callback);
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
