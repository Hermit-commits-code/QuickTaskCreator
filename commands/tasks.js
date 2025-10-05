const { logWorkspace, logUser } = require("../models/analyticsModel");
module.exports = function (app, db) {
  // Register modularized handlers
  const {
    registerSingleTaskHandlers,
  } = require("../utils/tasks/singleTaskHandlers");
  registerSingleTaskHandlers(app, db);
  const {
    registerBatchActions,
  } = require("../utils/tasks/batchActionsHandlers");
  registerBatchActions(app, db);

  // /tasks command and modal
  app.command("/tasks", async ({ ack, respond, client, body }) => {
    await ack();
    // Log analytics
    const workspace_id = body.team_id;
    logWorkspace(workspace_id, "Slack Workspace");
    logUser(body.user_id, workspace_id, "Slack User");
    db.all(
      `SELECT * FROM tasks WHERE status = 'open' AND workspace_id = ?`,
      [workspace_id],
      async (err, rows) => {
        if (err) {
          respond({
            text: "Error fetching tasks.",
            response_type: "ephemeral",
          });
          console.error("[ERROR] /tasks: Error fetching tasks.", err);
          return;
        }
        if (rows.length === 0) {
          respond({ text: "No open tasks.", response_type: "ephemeral" });
          return;
        }
        const blocks = rows.map((t) => {
          let assigned = t.assigned_user
            ? ` _(Assigned to: <@${t.assigned_user}> )_`
            : "";
          let due = t.due_date ? ` _(Due: ${t.due_date})_` : "";
          let category = t.category ? ` _(Category: ${t.category})_` : "";
          let tags = t.tags ? ` _(Tags: ${t.tags})_` : "";
          let priority = t.priority ? ` _(Priority: ${t.priority})_` : "";
          return {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${t.description}*${assigned}${due}${category}${tags}${priority}`,
            },
            accessory: {
              type: "button",
              text: { type: "plain_text", text: "Complete" },
              action_id: `complete_task_${t.id}`,
              value: String(t.id),
            },
          };
        });
        blocks.push({
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Edit" },
              action_id: "edit_task",
              value: "edit",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Delete" },
              action_id: "delete_task",
              value: "delete",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Batch Actions" },
              action_id: "batch_task_actions",
              value: "batch",
            },
          ],
        });
        client.chat
          .postMessage({
            channel: body.channel_id,
            blocks,
            text: "Open Tasks",
          })
          .catch((error) => {
            console.error("/tasks db callback error:", error);
            respond({
              text: ":x: Internal error. Please try again later.",
              response_type: "ephemeral",
            });
          });
      }
    );
  });
};
