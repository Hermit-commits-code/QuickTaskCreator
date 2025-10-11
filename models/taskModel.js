// models/taskModel.js
const connectDB = require('../db');

// No initTaskTable needed for MongoDB
async function getOpenTasks(workspace_id) {
  const db = await connectDB();
  return db
    .collection('tasks')
    .find({ status: 'open', workspace_id })
    .toArray();
}

async function createTask(
  workspace_id,
  description,
  assignedUser,
  dueDate,
  category,
  tags,
  priority,
) {
  const db = await connectDB();
  const result = await db.collection('tasks').insertOne({
    workspace_id,
    description,
    assigned_user: assignedUser,
    due_date: dueDate,
    category,
    tags,
    priority,
    status: 'open',
    reminder_status: 'pending',
    next_reminder_time: null,
    recurrence_type: 'none',
    recurrence_interval: 1,
    recurrence_end_date: null,
  });
  return result.insertedId;
}

async function updateTask(
  workspace_id,
  id,
  newDesc,
  assignedUser,
  dueDate,
  category,
  tags,
  priority,
) {
  const db = await connectDB();
  const { ObjectId } = require('mongodb');
  return db.collection('tasks').updateOne(
    { _id: new ObjectId(id), workspace_id },
    {
      $set: {
        description: newDesc,
        assigned_user: assignedUser,
        due_date: dueDate,
        category,
        tags,
        priority,
      },
    },
  );
}

async function completeTask(workspace_id, id) {
  const db = await connectDB();
  const { ObjectId } = require('mongodb');
  return db
    .collection('tasks')
    .updateOne(
      { _id: new ObjectId(id), workspace_id },
      { $set: { status: 'complete' } },
    );
}

async function deleteTask(workspace_id, id) {
  const db = await connectDB();
  const { ObjectId } = require('mongodb');
  return db
    .collection('tasks')
    .deleteOne({ _id: new ObjectId(id), workspace_id });
}

function getOpenTasks(workspace_id, callback) {
  db.all(
    `SELECT * FROM tasks WHERE status = 'open' AND workspace_id = ?`,
    [workspace_id],
    callback,
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
  callback,
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
    callback,
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
  callback,
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
    callback,
  );
}

function completeTask(workspace_id, id, callback) {
  db.run(
    `UPDATE tasks SET status = 'complete' WHERE id = ? AND workspace_id = ?`,
    [id, workspace_id],
    callback,
  );
}

function deleteTask(id, callback) {
  db.run(
    `DELETE FROM tasks WHERE id = ? AND workspace_id = ?`,
    [id, workspace_id],
    callback,
  );
}

module.exports = {
  getOpenTasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
};
