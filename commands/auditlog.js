// commands/auditlog.js
const { getRecentActivity } = require("../models/activityLogModel");
const { isAdmin } = require("../models/adminModel");

module.exports = function (app) {
  app.command("/auditlog", async ({ command, ack, respond }) => {
    await ack();
    const userId = command.user_id;
    isAdmin(userId, async (err, isAdminUser) => {
      if (err || !isAdminUser) {
        await respond({
          text: "You do not have permission to view the audit log.",
        });
        return;
      }
      getRecentActivity(20, (err, rows) => {
        if (err) {
          respond({ text: "Error fetching activity log." });
          return;
        }
        if (!rows.length) {
          respond({ text: "No activity log entries found." });
          return;
        }
        const blocks = rows.map((entry) => ({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${entry.timestamp}* - <@${entry.user_id}>: *${entry.action}*\n${entry.details}`,
          },
        }));
        respond({ blocks });
      });
    });
  });
};
