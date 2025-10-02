// /removeadmin command handler
module.exports = function (app, db) {
  app.command("/removeadmin", async ({ command, ack, respond, body }) => {
    await ack();
    const mentionMatch = command.text.trim().match(/<@([A-Z0-9]+)>/);
    const userId = mentionMatch ? mentionMatch[1] : null;
    if (!userId) {
      respond({
        text: "❗ Usage: /removeadmin <@user>",
        response_type: "ephemeral",
      });
      return;
    }
    // Only allow current admins to remove other admins
    db.get(
      "SELECT * FROM admins WHERE user_id = ?",
      [body.user_id],
      (err, adminRow) => {
        if (err || !adminRow) {
          respond({
            text: "❗ Only admins can remove other admins.",
            response_type: "ephemeral",
          });
          return;
        }
        db.run(
          "DELETE FROM admins WHERE user_id = ?",
          [userId],
          function (err) {
            if (err || this.changes === 0) {
              respond({
                text: "❗ Failed to remove admin. User not found or database error.",
                response_type: "ephemeral",
              });
            } else {
              respond({
                text: `:no_entry: Admin privileges removed for <@${userId}>.`,
                response_type: "in_channel",
              });
            }
          }
        );
      }
    );
  });
};
