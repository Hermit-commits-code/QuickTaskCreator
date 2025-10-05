// /task command handler
const { logWorkspace, logUser } = require("../models/analyticsModel");
module.exports = function (app, db) {
  const { getTaskModal } = require("../blockKit/taskModal");
  app.command("/task", async ({ ack, client, body }) => {
    await ack();
    // Log workspace and user activity
    const workspace_id = body.team_id;
    logWorkspace(workspace_id, "Slack Workspace");
    logUser(body.user_id, workspace_id, "Slack User");
    // Open modal for task creation, pass channel_id as private_metadata
    await client.views.open({
      trigger_id: body.trigger_id,
      view: getTaskModal(body.channel_id),
    });
  });
  app.view("task_modal_submit", async ({ ack, body, view, client }) => {
    await ack();
    const description =
      view.state.values.description_block.description_input.value;
    const assignedUser = view.state.values.user_block.user_select.selected_user;
    const dueDate = view.state.values.due_block.due_input.value;
    const category =
      view.state.values.category_block?.category_input?.value || "";
    const tags = view.state.values.tags_block?.tags_input?.value || "";
    const priority =
      view.state.values.priority_block?.priority_select?.selected_option
        ?.value || "Medium";
    const creatorId = body.user.id;
    // Retrieve channelId from private_metadata (robust)
    let channelId = null;
    try {
      if (view.private_metadata) {
        const meta = JSON.parse(view.private_metadata);
        if (meta.channel_id) channelId = meta.channel_id;
      }
    } catch (e) {
      channelId = view.private_metadata || null;
    }
    // Insert task into DB (multi-tenant)
    const workspace_id = body.team.id || body.team_id;
    db.run(
      `INSERT INTO tasks (workspace_id, description, assigned_user, due_date, category, tags, priority) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        workspace_id,
        description,
        assignedUser,
        dueDate,
        category,
        tags,
        priority,
      ],
      async function (err) {
        if (channelId && channelId.startsWith("C")) {
          if (err) {
            await client.chat.postEphemeral({
              channel: channelId,
              user: creatorId,
              text: "❗ Error creating task.",
            });
          } else {
            await client.chat.postEphemeral({
              channel: channelId,
              user: creatorId,
              text: `:white_check_mark: Task created: *${description}* (Assigned to: <@${assignedUser}>) (Due: ${dueDate}) [${category}] [${tags}] [Priority: ${priority}]`,
            });
            // Notify assigned user if different
            if (assignedUser !== creatorId) {
              await client.chat.postEphemeral({
                channel: channelId,
                user: assignedUser,
                text: `:bell: You’ve been assigned a new task by <@${creatorId}>: *${description}* (Due: ${dueDate}) [${category}] [${tags}] [Priority: ${priority}]`,
              });
            }
          }
        } else {
          // No valid channel context, log error
          console.error(
            "[ERROR] No valid channel_id for postEphemeral in /task modal submission.",
            channelId
          );
        }
      }
    );
  });
  // Update help text for /task command
  app.command("/task-help", async ({ ack, respond }) => {
    await ack();
    respond({
      text: "To create a task, simply type /task and press enter. Fill out the details in the popup modal. No need to type the task info in the command line.",
      response_type: "ephemeral",
    });
  });
};
