// Block Kit modal for removing an admin
function getRemoveAdminModal(admins) {
  return {
    type: "modal",
    callback_id: "remove_admin_modal_submit",
    title: {
      type: "plain_text",
      text: "Remove Admin",
    },
    submit: {
      type: "plain_text",
      text: "Remove",
    },
    close: {
      type: "plain_text",
      text: "Cancel",
    },
    blocks: [
      {
        type: "input",
        block_id: "admin_block",
        element: {
          type: "static_select",
          action_id: "admin_select",
          placeholder: {
            type: "plain_text",
            text: "Select an admin to remove",
          },
          options: admins.map((admin) => ({
            text: {
              type: "plain_text",
              text: admin.name
                ? `${admin.name} (<@${admin.user_id}>)`
                : `<@${admin.user_id}>`,
            },
            value: admin.user_id,
          })),
        },
        label: {
          type: "plain_text",
          text: "Admin User",
        },
      },
    ],
  };
}

module.exports = { getRemoveAdminModal };
