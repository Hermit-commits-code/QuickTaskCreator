// Feedback modal Block Kit
function getFeedbackModal() {
  return {
    type: "modal",
    callback_id: "feedback_modal_submit",
    title: { type: "plain_text", text: "Submit Feedback" },
    submit: { type: "plain_text", text: "Send" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      {
        type: "input",
        block_id: "feedback_block",
        element: {
          type: "plain_text_input",
          action_id: "feedback_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Share your feedback or feature request...",
          },
        },
        label: { type: "plain_text", text: "Your Feedback" },
      },
    ],
  };
}
module.exports = { getFeedbackModal };
