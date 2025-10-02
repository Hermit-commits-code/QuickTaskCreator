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
      {
        type: "input",
        block_id: "category_block",
        element: {
          type: "plain_text_input",
          action_id: "category_input",
          placeholder: {
            type: "plain_text",
            text: "Enter category (e.g. Bug, Feature, Chore)",
          },
        },
        label: {
          type: "plain_text",
          text: "Category",
        },
      },
      {
        type: "input",
        block_id: "tags_block",
        element: {
          type: "plain_text_input",
          action_id: "tags_input",
          placeholder: {
            type: "plain_text",
            text: "Comma-separated tags (e.g. urgent, frontend)",
          },
        },
        label: {
          type: "plain_text",
          text: "Tags",
        },
      },
      {
        type: "input",
        block_id: "priority_block",
        element: {
          type: "static_select",
          action_id: "priority_select",
          placeholder: {
            type: "plain_text",
            text: "Select priority",
          },
          options: [
            { text: { type: "plain_text", text: "Low" }, value: "Low" },
            { text: { type: "plain_text", text: "Medium" }, value: "Medium" },
            { text: { type: "plain_text", text: "High" }, value: "High" },
          ],
        },
        label: {
          type: "plain_text",
          text: "Priority",
        },
      },
    ],
  };
}

module.exports = { getTaskModal };
