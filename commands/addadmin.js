// /addadmin command handler (modal-based)
const { getAddAdminModal } = require("../blockKit/addAdminModal");

module.exports = function (app, db) {
  app.command("/add-admin", async ({ ack, body, client }) => {
    await ack(); // Call ack immediately, only once
    // Check if there are any admins yet
    db.get("SELECT COUNT(*) AS count FROM admins", [], async (err, row) => {
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
          "INSERT INTO admins (user_id) VALUES (?)",
          [body.user_id],
          function (err2) {
            if (err2) {
              client.chat.postEphemeral({
                channel: body.channel_id,
                user: body.user_id,
                text: "❗ Failed to set you as admin. Database error.",
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
                view: getAddAdminModal(),
              });
            }
          }
        );
      } else {
        // Only allow current admins to add other admins
        db.get(
          "SELECT * FROM admins WHERE user_id = ?",
          [body.user_id],
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
                view: getAddAdminModal(),
              });
            }
          }
        );
      }
    });
  });

  // Modal submission handler
  app.view("add_admin_modal_submit", async ({ ack, body, view, client }) => {
    await ack();
    const user = body.user.id;
    const selectedUser = view.state.values.user_block.user_select.selected_user;
    db.run(
      "INSERT OR IGNORE INTO admins (user_id) VALUES (?)",
      [selectedUser],
      function (err) {
        const { logActivity } = require("../models/activityLogModel");
        logActivity(
          user,
          "add_admin",
          `Admin privileges granted to <@${selectedUser}>`
        );
        if (err) {
          client.chat.postEphemeral({
            channel: body.view.private_metadata || body.channel.id,
            user,
            text: "❗ Failed to add admin. Database error.",
          });
        } else {
          client.chat.postEphemeral({
            channel: body.view.private_metadata || body.channel.id,
            user,
            text: `:white_check_mark: Admin privileges granted to <@${selectedUser}>.`,
          });
        }
      }
    );
  });
};
