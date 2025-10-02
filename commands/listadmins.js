// /listadmins command handler (modal-based)
const { getListAdminsModal } = require("../blockKit/listAdminsModal");

module.exports = function (app, db) {
  app.command("/listadmins", async ({ ack, body, client }) => {
    await ack();
    db.all("SELECT * FROM admins", [], async (err, admins) => {
      if (err) {
        await client.chat.postEphemeral({
          channel: body.channel_id,
          user: body.user_id,
          text: "Error fetching admins.",
        });
        return;
      }
      await client.views.open({
        trigger_id: body.trigger_id,
        view: getListAdminsModal(admins),
      });
    });
  });
};
