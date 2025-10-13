// Admin command handlers for Quick Task Creator
module.exports = function registerAdminHandlers(app, db) {
  function isAdmin(userId, callback) {
    db.get(
      `SELECT user_id FROM admins WHERE user_id = ?`,
      [userId],
      (err, row) => {
        callback(!!row);
      }
    );
  }

  // /addadmin <@user> command
  app.command("/addadmin", async ({ command, ack, respond, body, client }) => {
    await ack();
    const requesterId = body.user_id;
    // Debug log for troubleshooting
    console.log("/addadmin command text:", command.text);
    let newAdminId = null;
    let mentionMatch = command.text.trim().match(/<@([A-Z0-9]+)>/);
    console.log("mentionMatch:", mentionMatch);
    if (mentionMatch) {
      newAdminId = mentionMatch[1];
    } else {
      // Try to resolve @username to user ID using Slack API
      const usernameMatch = command.text.trim().match(/^@?([a-zA-Z0-9._-]+)$/);
      if (usernameMatch) {
        const username = usernameMatch[1];
        try {
          // Search for user by username
          const users = await client.users.list();
          if (users && users.members) {
            const found = users.members.find(
              (u) => u.name === username || u.profile?.display_name === username
            );
            if (found) {
              newAdminId = found.id;
            }
          }
        } catch (e) {
          console.error("Error fetching users from Slack API:", e);
        }
      }
    }
    if (!newAdminId) {
      await respond({
        text: "Usage: /addadmin <@username> (select from Slack autocomplete, or type @username)",
        response_type: "ephemeral",
      });
      return;
    }
    db.all(`SELECT user_id FROM admins`, [], (err, rows) => {
      if (err) {
        respond({
          text: "Error accessing admin list.",
          response_type: "ephemeral",
        });
        return;
      }
      // Bootstrap: allow first user to add self if no admins exist
      if (rows.length === 0 && requesterId === newAdminId) {
        db.run(
          `INSERT INTO admins (user_id) VALUES (?)`,
          [newAdminId],
          function (err) {
            if (err) {
              respond({
                text: "Error adding admin.",
                response_type: "ephemeral",
              });
            } else {
              respond({
                text: `You are now an admin!`,
                response_type: "ephemeral",
              });
            }
          }
        );
        return;
      }
      // Only existing admins can add others
      isAdmin(requesterId, (isRequesterAdmin) => {
        if (!isRequesterAdmin) {
          respond({
            text: "❗ Only admins can add other admins.",
            response_type: "ephemeral",
          });
          return;
        }
        db.run(
          `INSERT OR IGNORE INTO admins (user_id) VALUES (?)`,
          [newAdminId],
          function (err) {
            if (err) {
              respond({
                text: "Error adding admin.",
                response_type: "ephemeral",
              });
            } else {
              respond({
                text: `<@${newAdminId}> is now an admin.`,
                response_type: "ephemeral",
              });
            }
          }
        );
      });
    });
  });

  // /listadmins command
  // /listadmins handler removed; use modal-based handler in commands/listadmins.js
};
