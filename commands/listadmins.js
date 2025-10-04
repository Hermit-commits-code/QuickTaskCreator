// /listadmins command handler (modal-based)
const { getListAdminsModal } = require("../blockKit/listAdminsModal");

module.exports = function (app, db) {
  // Promisify db.all for async/await
  function getAdminsAsync() {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM admins", [], (err, admins) => {
        if (err) return reject(err);
        resolve(admins);
      });
    });
  }

  app.command("/listadmins", async ({ ack, body, client }) => {
    await ack();
    try {
      const admins = await getAdminsAsync();
      await client.views.open({
        trigger_id: body.trigger_id,
        view: getListAdminsModal(admins),
      });
    } catch (err) {
      console.error("[ERROR] /listadmins:", err);
      await client.chat.postEphemeral({
        channel: body.channel_id,
        user: body.user_id,
        text: "Error fetching admins or opening modal.",
      });
    }
  });
};
