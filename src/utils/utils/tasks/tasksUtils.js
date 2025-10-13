// Utility functions for tasks
function sendBatchResult(client, body, results) {
  client.chat.postEphemeral({
    channel: body.view?.private_metadata || body.channel?.id,
    user: body.user?.id,
    text: `Batch Action Results:\n${results.join("\n")}`,
  });
}

module.exports = { sendBatchResult };
