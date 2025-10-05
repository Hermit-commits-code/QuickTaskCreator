// /setdigestchannel command handler
const { setSetting } = require("../models/settingsModel");

module.exports = function (app, db) {
  app.command("/setdigestchannel", async ({ ack, command, body, client }) => {
    await ack();
    const workspace_id = body.team_id;
    // Accept channel ID as argument
    const channelId = command.text.trim();
    if (!channelId || !channelId.startsWith("C")) {
      await client.chat.postEphemeral({
        channel: body.channel_id,
        user: body.user_id,
        text: ":warning: Please provide a valid Slack channel ID (e.g. C12345678).",
      });
      return;
    }
    setSetting("digest_channel", channelId, workspace_id, (err) => {
      if (err) {
        client.chat.postEphemeral({
          channel: body.channel_id,
          user: body.user_id,
          text: ":x: Failed to set digest channel. Please try again.",
        });
      } else {
        client.chat.postEphemeral({
          channel: body.channel_id,
          user: body.user_id,
          text: `:white_check_mark: Digest channel set to <#${channelId}>!`,
        });
      }
    });
  });
};
