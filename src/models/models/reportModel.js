// models/reportModel.js
const connectDB = require('../db');

async function getTaskStats(workspace_id) {
  const db = await connectDB();
  const tasks = db.collection('tasks');
  const [total, completed, overdue, open, byCategory, byPriority, byUser] =
    await Promise.all([
      tasks.countDocuments({ workspace_id }),
      tasks.countDocuments({ status: 'completed', workspace_id }),
      tasks.countDocuments({
        status: 'open',
        workspace_id,
        due_date: { $lt: new Date().toISOString().slice(0, 10) },
      }),
      tasks.countDocuments({ status: 'open', workspace_id }),
      tasks
        .aggregate([
          { $match: { workspace_id } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $project: { category: '$_id', count: 1, _id: 0 } },
        ])
        .toArray(),
      tasks
        .aggregate([
          { $match: { workspace_id } },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
          { $project: { priority: '$_id', count: 1, _id: 0 } },
        ])
        .toArray(),
      tasks
        .aggregate([
          { $match: { workspace_id } },
          { $group: { _id: '$assigned_user', count: { $sum: 1 } } },
          { $project: { assigned_user: '$_id', count: 1, _id: 0 } },
        ])
        .toArray(),
    ]);
  return {
    total,
    completed,
    overdue,
    open,
    byCategory,
    byPriority,
    byUser,
  };
}

module.exports = { getTaskStats };
