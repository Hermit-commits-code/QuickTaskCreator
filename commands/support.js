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
            text: "• GitHub Issues: [QuickTaskCreator Issues](https://github.com/Hermit-commits-code/QuickTaskCreator/issues)\n• Use the buttons below to submit feedback or report a bug.",
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
              text: { type: "plain_text", text: "Report a Bug" },
              value: "bug",
              action_id: "open_bug_report",
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

  // Bug report modal trigger
  app.action("open_bug_report", async ({ ack, body, client }) => {
    await ack();
    // Get channel id from body (action payload)
    const channel_id = body.channel?.id || body.channel_id;
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        ...getBugReportModal(),
        private_metadata: JSON.stringify({ channel_id }),
      },
    });
  });
  app.view("bug_report_modal_submit", async ({ ack, body, view, client }) => {
    await ack();
    // Debug log to trace modal submission
    console.log("[DEBUG] bug_report_modal_submit invoked", {
      user: body.user?.id,
      team: body.team?.id || body.team_id,
      viewState: view.state?.values,
      private_metadata: view.private_metadata
    });
    // Collect all modal fields
    const title = view.state.values.title_block.title_input.value;
    const steps = view.state.values.steps_block.steps_input.value;
    const expected = view.state.values.expected_block.expected_input.value;
    const actual = view.state.values.actual_block.actual_input.value;
    const env = view.state.values.env_block?.env_input?.value || "";
    const context = view.state.values.context_block?.context_input?.value || "";

    // Format bug report for DB and GitHub
    const bugDetails = `Title: ${title}\n\nSteps to Reproduce:\n${steps}\n\nExpected Behavior:\n${expected}\n\nActual Behavior:\n${actual}\n\nEnvironment: ${env}\n\nAdditional Context/Screenshots:\n${context}`;
    let githubIssueUrl = null;
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
      await insertBugReport(body.user.id, bugDetails);
      // Create GitHub issue
      const issue = await createGithubIssue(
        title || `Bug report from Slack user ${body.user.id}`,
        bugDetails
      );
      githubIssueUrl = issue.html_url;
    } catch (err) {
      if (channel_id && channel_id.startsWith("C")) {
        await client.chat.postEphemeral({
          channel: channel_id,
          user: body.user.id,
          text: ":x: Failed to log bug report or create GitHub issue. Please try again later.",
        });
      } else {
        console.error(
          "[ERROR] No valid channel_id for postEphemeral in /support bug report modal submission.",
          channel_id
        );
      }
      return;
    }
    let responseText = ":white_check_mark: Thank you for reporting a bug!";
    if (githubIssueUrl) {
      responseText += `\nGitHub Issue: ${githubIssueUrl}`;
    }
    if (channel_id && channel_id.startsWith("C")) {
      await client.chat.postEphemeral({
        channel: channel_id,
        user: body.user.id,
        text: responseText,
      });
    } else {
      console.error(
        "[ERROR] No valid channel_id for postEphemeral in /support bug report modal submission.",
        channel_id
      );
    }
  });
};
