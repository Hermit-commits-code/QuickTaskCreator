// Block Kit modal for editing a task
function getEditTaskModal(userTasks) {
  return {
    type: "modal",
    callback_id: "edit_task_modal_submit",
    title: {
      type: "plain_text",
      text: "Edit Task",
    },
    submit: {
      type: "plain_text",
      text: "Save Changes",
    },
    close: {
      type: "plain_text",
      text: "Cancel",
    },
    blocks: [
      // Section divider for clarity
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Edit Task*\n_All fields are accessible. Use Tab to navigate. Labels and placeholders are screen reader friendly._",
        },
      },
      {
        type: "input",
        block_id: "task_block",
        element: {
          type: "static_select",
          action_id: "task_select",
          placeholder: {
            type: "plain_text",
            text: "Select a task to edit. (Screen reader: Task select input)",
          },
          options: userTasks.map((task) => ({
            text: {
              type: "plain_text",
              text: `${task.description} (Due: ${task.due_date || "N/A"})`,
            },
            value: String(task.id),
          })),
        },
        label: {
          type: "plain_text",
          text: "Task (required)",
        },
        hint: {
          type: "plain_text",
          text: "Select the task to edit. Accessible for screen readers.",
        },
      },
      {
        type: "input",
        block_id: "desc_block",
        element: {
          type: "plain_text_input",
          action_id: "desc_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Description...",
          },
        },
        label: {
          type: "plain_text",
          text: "Description",
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
            text: "Due (YYYY-MM-DD)",
          },
        },
        label: {
          type: "plain_text",
          text: "Due",
        },
      },
      // Optional fields section
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Optional Details*",
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
            text: "Category (e.g. Bug)",
          },
        },
        label: {
          type: "plain_text",
          text: "Category",
        },
        optional: true,
      },
      {
        type: "input",
        block_id: "tags_block",
        element: {
          type: "plain_text_input",
          action_id: "tags_input",
          placeholder: {
            type: "plain_text",
            text: "Tags (comma-separated)",
          },
        },
        label: {
          type: "plain_text",
          text: "Tags",
        },
        optional: true,
      },
      {
        type: "input",
        block_id: "priority_block",
        element: {
          type: "static_select",
          action_id: "priority_select",
          placeholder: {
            type: "plain_text",
            text: "Priority",
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
        optional: true,
      },
    ],
  };
}

module.exports = { getEditTaskModal };
