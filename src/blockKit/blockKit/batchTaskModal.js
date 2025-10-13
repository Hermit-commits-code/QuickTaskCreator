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
      // Section divider for clarity
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Batch Actions*\n_All fields are accessible. Use Tab to navigate. Labels and placeholders are screen reader friendly._",
        },
      },
      {
        type: "input",
        block_id: "tasks_block",
        element: {
          type: "multi_static_select",
          action_id: "tasks_select",
          placeholder: {
            type: "plain_text",
            text: "Select tasks for batch action. (Screen reader: Tasks multi-select input)",
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
          text: "Tasks (required)",
        },
        hint: {
          type: "plain_text",
          text: "Select one or more tasks. Accessible for screen readers.",
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
            text: "Action",
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
            ? ":warning: *Deleting tasks is permanent.*"
            : "You can only delete your own tasks.",
        },
      },
    ],
  };
}

module.exports = { getBatchTaskModal };
