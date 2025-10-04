// Modular command handler imports
const taskHandler = require("./commands/task");
const taskEditHandler = require("./commands/taskEdit");
const taskCompleteHandler = require("./commands/taskComplete");
const taskDeleteHandler = require("./commands/taskDelete");
const tasksHandler = require("./commands/tasks");

const reminderActionsHandler = require("./commands/reminderActions");

const addAdminHandler = require("./commands/addadmin");
const listAdminsHandler = require("./commands/listadmins");
const notifyPrefsHandler = require("./commands/notifyprefs");

module.exports = function (app, db) {
  taskHandler(app, db);
  taskEditHandler(app, db);
  taskCompleteHandler(app, db);
  taskDeleteHandler(app, db);
  tasksHandler(app, db);
  reminderActionsHandler(app, db);
  addAdminHandler(app, db);
  listAdminsHandler(app, db);
  notifyPrefsHandler(app);
  require("./commands/deleteWorkspaceData")(app);
};
