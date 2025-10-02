// Block Kit modal for batch complete/delete actions
function getBatchTaskModal(tasks, isAdmin) {
  return {
    type: "modal",
    callback_id: "batch_task_modal_submit",
    title: {
      type: "plain_text",
      text: "Batch Task Actions",
    },
    submit: {
      type: "plain_text",
      text: "Apply",
    },
    close: {
      type: "plain_text",
      text: "Cancel",
    },
    blocks: [
      {
        type: "input",
        block_id: "tasks_block",
        element: {
          type: "multi_static_select",
          action_id: "tasks_select",
          placeholder: {
            type: "plain_text",
            text: "Select tasks",
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
          text: "Tasks",
        },
      },
      {
        type: "input",
        block_id: "action_block",
        element: {
          type: "static_select",
          action_id: "action_select",
          placeholder: {
            type: "plain_text",
            text: "Select action",
          },
          options: [
            {
              text: { type: "plain_text", text: "Complete" },
              value: "complete",
            },
            {
              text: { type: "plain_text", text: "Delete" },
              value: "delete",
            },
          ],
        },
        label: {
          type: "plain_text",
          text: "Action",
        },
      },
      // Confirmation step for delete
      {
        type: "section",
        block_id: "confirm_block",
        text: {
          type: "mrkdwn",
          text: isAdmin
            ? ":warning: *Batch delete will permanently remove selected tasks. This action cannot be undone.*"
            : "You can only delete your own tasks.",
        },
      },
    ],
  };
}

module.exports = { getBatchTaskModal };
