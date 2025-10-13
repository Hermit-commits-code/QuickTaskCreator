// Bug report modal Block Kit
function getBugReportModal() {
  return {
    type: "modal",
    callback_id: "bug_report_modal_submit",
    title: { type: "plain_text", text: "Report a Bug" },
    submit: { type: "plain_text", text: "Send" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      {
        type: "input",
        block_id: "title_block",
        element: {
          type: "plain_text_input",
          action_id: "title_input",
          placeholder: {
            type: "plain_text",
            text: "Short summary of the bug",
          },
        },
        label: { type: "plain_text", text: "Title" },
      },
      {
        type: "input",
        block_id: "steps_block",
        element: {
          type: "plain_text_input",
          action_id: "steps_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "List the steps to reproduce the bug",
          },
        },
        label: { type: "plain_text", text: "Steps to Reproduce" },
      },
      {
        type: "input",
        block_id: "expected_block",
        element: {
          type: "plain_text_input",
          action_id: "expected_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "What did you expect to happen?",
          },
        },
        label: { type: "plain_text", text: "Expected Behavior" },
      },
      {
        type: "input",
        block_id: "actual_block",
        element: {
          type: "plain_text_input",
          action_id: "actual_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "What actually happened?",
          },
        },
        label: { type: "plain_text", text: "Actual Behavior" },
      },
      {
        type: "input",
        block_id: "env_block",
        element: {
          type: "plain_text_input",
          action_id: "env_input",
          placeholder: {
            type: "plain_text",
            text: "Browser, OS, Slack version, etc.",
          },
        },
        label: { type: "plain_text", text: "Environment" },
        optional: true,
      },
      {
        type: "input",
        block_id: "context_block",
        element: {
          type: "plain_text_input",
          action_id: "context_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Any additional context, links, or screenshots",
          },
        },
        label: { type: "plain_text", text: "Additional Context/Screenshots" },
        optional: true,
      },
    ],
  };
}
module.exports = { getBugReportModal };
