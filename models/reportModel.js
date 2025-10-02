// models/reportModel.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./tasks.db");

function getTaskStats(callback) {
  db.serialize(() => {
    let stats = {};
    db.get("SELECT COUNT(*) as total FROM tasks", (err, row) => {
      stats.total = row ? row.total : 0;
      db.get(
        "SELECT COUNT(*) as completed FROM tasks WHERE status = 'completed'",
        (err2, row2) => {
          stats.completed = row2 ? row2.completed : 0;
          db.get(
            "SELECT COUNT(*) as overdue FROM tasks WHERE status = 'open' AND due_date < date('now')",
            (err3, row3) => {
              stats.overdue = row3 ? row3.overdue : 0;
              db.get(
                "SELECT COUNT(*) as open FROM tasks WHERE status = 'open'",
                (err4, row4) => {
                  stats.open = row4 ? row4.open : 0;
                  db.all(
                    "SELECT category, COUNT(*) as count FROM tasks GROUP BY category",
                    (err5, rows5) => {
                      stats.byCategory = rows5 || [];
                      db.all(
                        "SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority",
                        (err6, rows6) => {
                          stats.byPriority = rows6 || [];
                          db.all(
                            "SELECT assigned_user, COUNT(*) as count FROM tasks GROUP BY assigned_user",
                            (err7, rows7) => {
                              stats.byUser = rows7 || [];
                              callback(null, stats);
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  });
}

module.exports = { db, getTaskStats };
