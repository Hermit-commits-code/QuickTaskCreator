// /task command handler
module.exports = function (app, db) {
  const { getTaskModal } = require("../blockKit/taskModal");
  app.command("/task", async ({ ack, client, body }) => {
    await ack();
    // Open modal for task creation
    await client.views.open({
      trigger_id: body.trigger_id,
      view: getTaskModal(),
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
    // Insert task into DB
    db.run(
      `INSERT INTO tasks (description, assigned_user, due_date, category, tags, priority) VALUES (?, ?, ?, ?, ?, ?)`,
      [description, assignedUser, dueDate, category, tags, priority],
      function (err) {
        if (err) {
          client.chat.postMessage({
            channel: creatorId,
            text: "❗ Error creating task.",
          });
        } else {
          // Notify creator
          client.chat.postMessage({
            channel: creatorId,
            text: `:white_check_mark: Task created: *${description}* (Assigned to: <@${assignedUser}>) (Due: ${dueDate}) [${category}] [${tags}] [Priority: ${priority}]`,
          });
          // Notify assigned user
          let assignedMsg = "";
          if (assignedUser === creatorId) {
            assignedMsg = `:memo: You created a new personal task: *${description}* (Due: ${dueDate}) [${category}] [${tags}] [Priority: ${priority}]`;
          } else {
            assignedMsg = `:bell: You’ve been assigned a new task by <@${creatorId}>: *${description}* (Due: ${dueDate}) [${category}] [${tags}] [Priority: ${priority}]`;
          }
          client.chat.postMessage({
            channel: assignedUser,
            text: assignedMsg,
          });
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
