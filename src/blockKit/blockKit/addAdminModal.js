// Block Kit modal for adding an admin
function getAddAdminModal(users) {
  return {
    type: "modal",
    callback_id: "add_admin_modal_submit",
    title: {
      type: "plain_text",
      text: "Add Admin",
    },
    submit: {
      type: "plain_text",
      text: "Add",
    },
    close: {
      type: "plain_text",
      text: "Cancel",
    },
    blocks: [
      {
        type: "input",
        block_id: "user_block",
        element: {
          type: "users_select",
          action_id: "user_select",
          placeholder: {
            type: "plain_text",
            text: "Select a user to make admin",
          },
        },
        label: {
          type: "plain_text",
          text: "User",
        },
      },
    ],
  };
}

module.exports = { getAddAdminModal };
