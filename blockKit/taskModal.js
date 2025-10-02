// Block Kit modal for creating a task with user picker
function getTaskModal() {
  return {
    type: "modal",
    callback_id: "task_modal_submit",
    title: {
      type: "plain_text",
      text: "Create Task",
    },
    submit: {
      type: "plain_text",
      text: "Create",
    },
    close: {
      type: "plain_text",
      text: "Cancel",
    },
    blocks: [
      {
        type: "input",
        block_id: "description_block",
        element: {
          type: "plain_text_input",
          action_id: "description_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Describe the task...",
          },
        },
        label: {
          type: "plain_text",
          text: "Task Description",
        },
      },
      {
        type: "input",
        block_id: "user_block",
        element: {
          type: "users_select",
          action_id: "user_select",
          placeholder: {
            type: "plain_text",
            text: "Select a user",
          },
        },
        label: {
          type: "plain_text",
          text: "Assign to",
        },
      },
      {
        type: "input",
        block_id: "due_block",
        element: {
          type: "plain_text_input",
          action_id: "due_input",
          placeholder: {
            type: "plain_text",
            text: "MM-DD-YYYY or YYYY-MM-DD",
          },
        },
        label: {
          type: "plain_text",
          text: "Due Date",
        },
      },
    ],
  };
}

module.exports = { getTaskModal };
