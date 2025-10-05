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
  // All modal logic removed; only /support command remains
};
