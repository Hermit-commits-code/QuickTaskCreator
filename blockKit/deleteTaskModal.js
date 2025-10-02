// Block Kit modal for deleting a task with optional reason
function getDeleteTaskModal(tasks) {
  return {
    type: "modal",
    callback_id: "delete_task_modal_submit",
    title: {
      type: "plain_text",
      text: "Delete Task",
    },
    submit: {
      type: "plain_text",
      text: "Delete",
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
            text: "Select a task to delete",
          },
          options: tasks.map((task) => ({
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
        block_id: "reason_block",
        element: {
          type: "plain_text_input",
          action_id: "reason_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Add reason for deletion (optional)",
          },
        },
        label: {
          type: "plain_text",
          text: "Reason for Deletion",
        },
        optional: true,
      },
    ],
  };
}

module.exports = { getDeleteTaskModal };
