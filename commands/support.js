// /support command handler
const { getFeedbackModal } = require("../blockKit/feedbackModal");
const { getBugReportModal } = require("../blockKit/bugReportModal");
const { insertFeedback } = require("../models/feedbackModel");
const { insertBugReport } = require("../models/bugReportModel");
const { createGithubIssue } = require("../services/githubService");
module.exports = function (app) {
  app.command("/support", async ({ ack, body, client }) => {
    await ack();
    await client.chat.postEphemeral({
      channel: body.channel_id,
      user: body.user_id,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "Support & Feedback" },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Need help or want to share feedback?",
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "• *Report a Bug*: <https://github.com/Hermit-commits-code/QuickTaskCreator/issues|Open a GitHub Issue>\n• *Submit Feedback*: Send feedback to <mailto:hotcupofjoe2013@gmail.com|support@quicktaskcreator.com> or use the button below.",
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Submit Feedback" },
              value: "feedback",
              action_id: "open_feedback",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Report a Bug (GitHub)" },
              url: "https://github.com/Hermit-commits-code/QuickTaskCreator/issues",
              action_id: "open_github_issues",
            },
          ],
        },
        { type: "divider" },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "*Privacy:* No personal or message content is stored. Expected response time: 1-2 business days.",
            },
          ],
        },
      ],
      text: "Support & Feedback",
    });
  });

  // Feedback modal trigger
  app.action("open_feedback", async ({ ack, body, client }) => {
    await ack();
    // Get channel id from body (action payload)
    const channel_id = body.channel?.id || body.channel_id;
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        ...getFeedbackModal(),
        private_metadata: JSON.stringify({ channel_id }),
      },
    });
  });
  app.view("feedback_modal_submit", async ({ ack, body, view, client }) => {
    await ack();
    const feedback = view.state.values.feedback_block.feedback_input.value;
    // Try to get channel_id from private_metadata or context
    let channel_id = null;
    try {
      if (view.private_metadata) {
        const meta = JSON.parse(view.private_metadata);
        if (meta.channel_id) channel_id = meta.channel_id;
      }
    } catch (e) {
      channel_id = view.private_metadata || null;
    }
    try {
      // workspace_id from body.team.id or body.team_id
      const workspace_id = body.team?.id || body.team_id;
      await insertFeedback(workspace_id, body.user.id, feedback);
    } catch (err) {
      console.error("[DB ERROR] Feedback logging failed:", err);
      if (channel_id && channel_id.startsWith("C")) {
        await client.chat.postEphemeral({
          channel: channel_id,
          user: body.user.id,
          text: ":x: Failed to log feedback. Please try again later.",
        });
      } else {
        console.error(
          "[ERROR] No valid channel_id for postEphemeral in /support feedback modal submission.",
          channel_id
        );
      }
      return;
    }
    if (channel_id && channel_id.startsWith("C")) {
      await client.chat.postEphemeral({
        channel: channel_id,
        user: body.user.id,
        text: ":white_check_mark: Thank you for your feedback!",
      });
    } else {
      console.error(
        "[ERROR] No valid channel_id for postEphemeral in /support feedback modal submission.",
        channel_id
      );
    }
  });

  // Remove bug report modal logic; now handled via GitHub link
};
