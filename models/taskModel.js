// models/taskModel.js
const connectDB = require('../db');

// MongoDB-based task model functions only
const connectDB = require('../db');
const { ObjectId } = require('mongodb');

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
  return db
    .collection('tasks')
    .updateOne(
      { _id: new ObjectId(id), workspace_id },
      { $set: { status: 'complete' } },
    );
}

async function deleteTask(workspace_id, id) {
  const db = await connectDB();
  return db
    .collection('tasks')
    .deleteOne({ _id: new ObjectId(id), workspace_id });
}

module.exports = {
  getOpenTasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
};
