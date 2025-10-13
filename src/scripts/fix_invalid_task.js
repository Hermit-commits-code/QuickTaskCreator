// fix_invalid_task.js
// Script to update or delete a task with an invalid user
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./tasks.db');

const TASK_ID = 18; // Change this if you want to fix a different task
const NEW_USER_ID = null; // Set to a valid Slack user ID, or null to unassign

// Option 1: Unassign the user (set assigned_user to NULL)
db.run(
  'UPDATE tasks SET assigned_user = ? WHERE id = ?',
  [NEW_USER_ID, TASK_ID],
  function (err) {
    if (err) {
      console.error('Error updating task:', err);
    } else {
      console.log(`Task ${TASK_ID} updated. assigned_user set to`, NEW_USER_ID);
    }
    db.close();
  },
);

// Option 2: To delete the task instead, comment out the above and uncomment below:
// db.run('DELETE FROM tasks WHERE id = ?', [TASK_ID], function(err) {
//   if (err) {
//     console.error('Error deleting task:', err);
//   } else {
//     console.log(`Task ${TASK_ID} deleted.`);
//   }
//   db.close();
// });
