// Block Kit modal for listing all admins
function getListAdminsModal(admins) {
  return {
    type: "modal",
    callback_id: "list_admins_modal",
    title: {
      type: "plain_text",
      text: "Current Admins",
    },
    close: {
      type: "plain_text",
      text: "Close",
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: admins.length
            ? admins
                .map((a) => `• <@${a.user_id}>${a.name ? ` (${a.name})` : ""}`)
                .join("\n")
            : "No admins found.",
        },
      },
    ],
  };
}

module.exports = { getListAdminsModal };
