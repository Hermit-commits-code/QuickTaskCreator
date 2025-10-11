const registerCompleteTaskHandler = require('./handlers/completeTaskHandler');
const registerEditTaskHandler = require('./handlers/editTaskHandler');
const registerDeleteTaskHandler = require('./handlers/deleteTaskHandler');
const registerDynamicTaskSelectHandler = require('./handlers/dynamicTaskSelectHandler');

function registerSingleTaskHandlers(app) {
  registerCompleteTaskHandler(app);
  registerEditTaskHandler(app);
  registerDeleteTaskHandler(app);
  registerDynamicTaskSelectHandler(app);
}

module.exports = { registerSingleTaskHandlers };
