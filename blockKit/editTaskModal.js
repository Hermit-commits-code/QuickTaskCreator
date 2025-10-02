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
      {
        type: "input",
        block_id: "task_block",
        element: {
          type: "static_select",
          action_id: "task_select",
          placeholder: {
            type: "plain_text",
            text: "Select a task to edit",
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
          text: "Task",
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
            text: "Update the task description",
          },
        },
        label: {
          type: "plain_text",
          text: "Task Description",
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

module.exports = { getEditTaskModal };
