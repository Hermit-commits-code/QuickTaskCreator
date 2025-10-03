// /removeadmin command handler

const { getRemoveAdminModal } = require("../blockKit/removeAdminModal");

module.exports = function (app, db) {
  // /removeadmin now opens a modal with a dropdown of current admins
  app.command("/removeadmin", async ({ ack, body, client }) => {
    await ack();
    // Only allow current admins to remove other admins
    db.get(
      "SELECT * FROM admins WHERE user_id = ?",
      [body.user_id],
      (err, adminRow) => {
        if (err || !adminRow) {
          client.chat.postEphemeral({
            channel: body.channel_id,
            user: body.user_id,
            text: "❗ Only admins can remove other admins.",
          });
          return;
        }
        // Get all admins for dropdown
        db.all("SELECT * FROM admins", [], async (err, admins) => {
          if (err || !admins.length) {
            client.chat.postEphemeral({
              channel: body.channel_id,
              user: body.user_id,
              text: "No admins found.",
            });
            return;
          }
          await client.views.open({
            trigger_id: body.trigger_id,
            view: getRemoveAdminModal(admins),
          });
        });
      }
    );
  });

  // Modal submission handler
  app.view("remove_admin_modal_submit", async ({ ack, body, view, client }) => {
    await ack();
    const user = body.user.id;
    const values = view.state.values;
    const adminId = values.admin_block.admin_select.selected_option.value;
    db.run("DELETE FROM admins WHERE user_id = ?", [adminId], function (err) {
      const { logActivity } = require("../models/activityLogModel");
      logActivity(
        user,
        "remove_admin",
        `Admin privileges removed for <@${adminId}>`
      );
      // Safely get channel ID for ephemeral message
      let channelId =
        body.view && body.view.private_metadata
          ? body.view.private_metadata
          : body.channel && body.channel.id
          ? body.channel.id
          : null;
      if (!channelId) {
        // Fallback: send to user as DM if channel is not available
        client.chat.postMessage({
          channel: user,
          text:
            err || this.changes === 0
              ? "❗ Failed to remove admin. User not found or database error."
              : `:no_entry: Admin privileges removed for <@${adminId}>.`,
        });
        return;
      }
      if (err || this.changes === 0) {
        client.chat.postEphemeral({
          channel: channelId,
          user,
          text: "❗ Failed to remove admin. User not found or database error.",
        });
      } else {
        client.chat.postEphemeral({
          channel: channelId,
          user,
          text: `:no_entry: Admin privileges removed for <@${adminId}>.`,
        });
      }
    });
  });
};
