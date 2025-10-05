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
            private_metadata: JSON.stringify({ channel_id: body.channel_id }),
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
    async ({ ack, body, view, client }) => {
      await ack();
      const workspace_id = body.team.id;
      const user_id = body.user.id;
      const confirmation = view.state.values.confirm_block.confirm_input.value;
      // Robustly parse channel_id from private_metadata
      let channel_id = null;
      try {
        if (view.private_metadata) {
          const meta = JSON.parse(view.private_metadata);
          if (meta.channel_id) channel_id = meta.channel_id;
        }
      } catch (e) {
        channel_id = view.private_metadata || null;
      }
      if (confirmation !== "DELETE") {
        await client.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: ":warning: Data deletion cancelled. You must type DELETE to confirm.",
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
        await client.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: ":wastebasket: All workspace data has been deleted.",
        });
      } catch (err) {
        await client.chat.postEphemeral({
          channel: channel_id,
          user: user_id,
          text: ":warning: Failed to delete workspace data. Please contact support.",
        });
      }
    }
  );
};
