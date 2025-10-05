// /addadmin command handler (modal-based)
const { getAddAdminModal } = require("../blockKit/addAdminModal");

module.exports = function (app, db) {
  app.command("/add-admin", async ({ ack, body, client }) => {
    try {
      await ack(); // Call ack immediately, only once
      // Check if there are any admins yet
      db.get(
        "SELECT COUNT(*) AS count FROM admins WHERE workspace_id = ?",
        [body.team_id],
        async (err, row) => {
          if (err) {
            await client.chat.postEphemeral({
              channel: body.channel_id,
              user: body.user_id,
              text: "❗ Database error. Please try again.",
            });
            return;
          }
          if (row.count === 0) {
            // No admins yet, make this user the first admin
            db.run(
              "INSERT INTO admins (user_id, workspace_id) VALUES (?, ?)",
              [body.user_id, body.team_id],
              function (err2) {
                if (err2) {
                  client.chat.postEphemeral({
                    channel: body.channel_id,
                    user: body.user_id,
                    text: "\u2757 Failed to set you as admin. Database error.",
                  });
                } else {
                  client.chat.postEphemeral({
                    channel: body.channel_id,
                    user: body.user_id,
                    text: ":white_check_mark: You are now the workspace admin! You can add other admins.",
                  });
                  // Open the add admin modal
                  client.views.open({
                    trigger_id: body.trigger_id,
                    view: {
                      ...getAddAdminModal(),
                      private_metadata: JSON.stringify({
                        channel_id: body.channel_id,
                      }),
                    },
                  });
                }
              }
            );
          } else {
            // Only allow current admins to add other admins
            db.get(
              "SELECT * FROM admins WHERE user_id = ? AND workspace_id = ?",
              [body.user_id, body.team_id],
              async (err, adminRow) => {
                if (err || !adminRow) {
                  await client.chat.postEphemeral({
                    channel: body.channel_id,
                    user: body.user_id,
                    text: "❗ Only admins can add other admins.",
                  });
                } else {
                  await client.views.open({
                    trigger_id: body.trigger_id,
                    view: {
                      ...getAddAdminModal(),
                      private_metadata: JSON.stringify({
                        channel_id: body.channel_id,
                      }),
                    },
                  });
                }
              }
            );
          }
        }
      );
    } catch (error) {
      console.error("/add-admin error:", error);
      await client.chat.postEphemeral({
        channel: body.channel_id,
        user: body.user_id,
        text: ":x: Internal error. Please try again later.",
      });
    }
  });

  // Modal submission handler
  app.view("add_admin_modal_submit", async ({ ack, body, view, client }) => {
    await ack();
    const user = body.user.id;
    const selectedUser = view.state.values.user_block.user_select.selected_user;
    const workspaceId = body.team.id || body.team_id;
    // Get channel_id from private_metadata
    let channel_id = null;
    try {
      if (view.private_metadata) {
        const meta = JSON.parse(view.private_metadata);
        if (meta.channel_id) channel_id = meta.channel_id;
      }
    } catch (e) {}
    // Prevent duplicate admin entries
    db.get(
      "SELECT * FROM admins WHERE user_id = ? AND workspace_id = ?",
      [selectedUser, workspaceId],
      function (err, row) {
        if (row) {
          client.chat.postEphemeral({
            channel: channel_id,
            user,
            text: `:information_source: <@${selectedUser}> is already an admin for this workspace.`,
          });
          return;
        }
        db.run(
          "INSERT INTO admins (user_id, workspace_id) VALUES (?, ?)",
          [selectedUser, workspaceId],
          function (err2) {
            const { logActivity } = require("../models/activityLogModel");
            logActivity(
              user,
              "add_admin",
              `Admin privileges granted to <@${selectedUser}>`
            );
            if (err2) {
              client.chat.postEphemeral({
                channel: channel_id,
                user,
                text: "❗ Failed to add admin. Database error.",
              });
            } else {
              client.chat.postEphemeral({
                channel: channel_id,
                user,
                text: `:white_check_mark: Admin privileges granted to <@${selectedUser}>.`,
              });
            }
          }
        );
      }
    );
  });
};
