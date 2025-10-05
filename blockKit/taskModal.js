// Block Kit modal for creating a task with user picker
function getTaskModal(channelId) {
  return {
    type: "modal",
    callback_id: "task_modal_submit",
    private_metadata: channelId || "",
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
      // Section divider for clarity
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Task Details*\n_All fields are accessible. Use Tab to navigate. Labels and placeholders are screen reader friendly._",
        },
      },
      {
        type: "input",
        block_id: "description_block",
        element: {
          type: "plain_text_input",
          action_id: "description_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Describe the task. Required. (Screen reader: Task description input)",
          },
        },
        label: {
          type: "plain_text",
          text: "Task Description (required)",
        },
        hint: {
          type: "plain_text",
          text: "Enter a clear, concise description. Accessible for screen readers.",
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
            text: "Select user to assign. (Screen reader: Assignee input)",
          },
        },
        label: {
          type: "plain_text",
          text: "Assignee (required)",
        },
        hint: {
          type: "plain_text",
          text: "Pick a user to assign the task. Accessible for screen readers.",
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
            text: "Due date (YYYY-MM-DD)",
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
      {
        type: "input",
        block_id: "recurrence_type_block",
        element: {
          type: "static_select",
          action_id: "recurrence_type_select",
          placeholder: {
            type: "plain_text",
            text: "Recurrence Type",
          },
          options: [
            { text: { type: "plain_text", text: "None" }, value: "none" },
            { text: { type: "plain_text", text: "Daily" }, value: "daily" },
            { text: { type: "plain_text", text: "Weekly" }, value: "weekly" },
            { text: { type: "plain_text", text: "Monthly" }, value: "monthly" },
          ],
        },
        label: {
          type: "plain_text",
          text: "Recurrence",
        },
        optional: true,
      },
      {
        type: "input",
        block_id: "recurrence_interval_block",
        element: {
          type: "plain_text_input",
          action_id: "recurrence_interval_input",
          placeholder: {
            type: "plain_text",
            text: "Interval (e.g. every 2 days)",
          },
        },
        label: {
          type: "plain_text",
          text: "Recurrence Interval",
        },
        optional: true,
      },
    ],
  };
}

module.exports = { getTaskModal };
