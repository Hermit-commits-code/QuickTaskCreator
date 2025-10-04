// Command handler for deleting all workspace data
const { db } = require("../models/taskModel");
module.exports = function (app) {
  const { isAdmin } = require("../models/adminModel");
  // Promisify isAdmin for async/await
  function isAdminAsync(user_id, workspace_id) {
    return new Promise((resolve, reject) => {
      isAdmin(user_id, workspace_id, (err, isAdminUser) => {
        if (err) return reject(err);
        resolve(isAdminUser);
      });
    });
  }

  app.command(
    "/delete-workspace-data",
    async ({ ack, body, client, respond }) => {
      await ack(); // Always acknowledge immediately
      try {
        const workspace_id = body.team_id;
        const user_id = body.user_id;
        let isAdminUser = false;
        try {
          isAdminUser = await isAdminAsync(user_id, workspace_id);
        } catch (err) {
          await client.chat.postEphemeral({
            channel: body.channel_id,
            user: body.user_id,
            text: ":no_entry: Only workspace admins can delete all data.",
          });
          return;
        }
        if (!isAdminUser) {
          await client.chat.postEphemeral({
            channel: body.channel_id,
            user: body.user_id,
            text: ":no_entry: Only workspace admins can delete all data.",
          });
          return;
        }
        // Ask for confirmation via modal
        await client.views.open({
          trigger_id: body.trigger_id,
          view: {
            type: "modal",
            callback_id: "delete_workspace_data_confirm",
            title: { type: "plain_text", text: "Confirm Data Deletion" },
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: ":warning: This will permanently delete ALL data for this workspace, including tasks, feedback, bug reports, settings, and admin records. This action cannot be undone.\n\nAre you sure you want to proceed?",
                },
              },
              {
                type: "input",
                block_id: "confirm_block",
                label: { type: "plain_text", text: "Type DELETE to confirm" },
                element: {
                  type: "plain_text_input",
                  action_id: "confirm_input",
                  placeholder: { type: "plain_text", text: "DELETE" },
                },
              },
            ],
            submit: { type: "plain_text", text: "Delete Data" },
            close: { type: "plain_text", text: "Cancel" },
          },
        });
      } catch (error) {
        await client.chat.postEphemeral({
          channel: body.channel_id,
          user: body.user_id,
          text: ":x: Internal error. Please try again later.",
        });
      }
    }
  );

  // Modal submission handler
  app.view(
    "delete_workspace_data_confirm",
    async ({ ack, body, view, respond }) => {
      await ack();
      const workspace_id = body.team.id;
      const user_id = body.user.id;
      const confirmation = view.state.values.confirm_block.confirm_input.value;
      if (confirmation !== "DELETE") {
        respond({
          text: ":warning: Data deletion cancelled. You must type DELETE to confirm.",
          response_type: "ephemeral",
        });
        return;
      }
      try {
        db.run("DELETE FROM tasks WHERE workspace_id = ?", [workspace_id]);
        db.run("DELETE FROM feedback WHERE workspace_id = ?", [workspace_id]);
        db.run("DELETE FROM bug_reports WHERE workspace_id = ?", [
          workspace_id,
        ]);
        db.run("DELETE FROM admins WHERE workspace_id = ?", [workspace_id]);
        db.run("DELETE FROM settings WHERE workspace_id = ?", [workspace_id]);
        db.run("DELETE FROM users WHERE workspace_id = ?", [workspace_id]);
        respond({
          text: ":wastebasket: All workspace data has been deleted.",
          response_type: "ephemeral",
        });
      } catch (err) {
        respond({
          text: ":warning: Failed to delete workspace data. Please contact support.",
          response_type: "ephemeral",
        });
      }
    }
  );
};
