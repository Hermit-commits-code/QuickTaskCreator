# Quick Task Creator

© 2025 Hermit-commits-code. All rights reserved.

Quick Task Creator is a lightweight Slack app for fast, frictionless task creation. Turn any Slack message into a structured task with a slash command or shortcut—no AI, no complex setup.

## Professional Modal-Based Task Management

- `/task` opens a Block Kit modal for structured task creation.
- Assign tasks using a Slack user picker—guaranteed correct user ID, no manual typing.
- Add rich context, due dates, and assign to any user in your workspace.
- Immediate DM notifications to both the creator and the assigned user, with context-aware messaging.
- All workflows are interactive, error-resistant, and enterprise-grade.
- Message shortcut: "Create Task" from any Slack message (right-click → More actions).
- Configurable task channel for daily digests.
- **Block Kit interactive buttons:** Complete, Edit, Delete — appear on every task message for easy management directly in Slack. Buttons trigger modals for seamless workflow.
- Lightweight storage (SQLite).
- **Daily digest of open tasks:** Automatic summary of all open tasks sent to your chosen Slack channel every morning at 9am. Channel can be set with `/setdigestchannel <channel_id>`.


**Reporting & Analytics:**

- Use `/report` to view workspace analytics: total tasks, completed, open, overdue, completion rate, recent activity (last 7 days), and breakdowns by category, priority, and user.
- Results are shown in a Slack message with summary, breakdowns, and professional enhancements.

- Use `/setconfig` to open a modal and set the daily digest channel, digest time, and reminder time (all in cron format).
- Settings are stored in the database and used for all notifications and digests.

- Every task now supports a category (e.g. Bug, Feature, Chore), comma-separated tags (e.g. urgent, frontend), and a priority (Low, Medium, High).
- You can set these fields when creating or editing a task via the modal.
- The `/tasks` list displays category, tags, and priority for each task.
- You can batch complete/delete tasks with these fields visible in the modal and results.

**Bulk Task Actions (Multi-Select Modal):**

- `/tasks` now includes a "Batch Actions" button. Click to open a modal where you can select multiple tasks and choose to complete or delete them in one action.
- The modal uses a multi-select picker for tasks and an action dropdown (Complete/Delete).
- Admins can batch complete or delete any open task. Regular users can only batch complete or delete their own tasks.
- Error handling: If you select a task you don't have permission to modify, you'll see a clear error message for that task in the results.
- All batch actions are processed individually, and results are shown in a single ephemeral message.

**Example Bulk Actions Workflow:**

1. Type `/tasks` in Slack.
2. Click the "Batch Actions" button.
3. In the modal, select multiple tasks and choose "Complete" or "Delete".
4. Submit to apply the action to all selected tasks. Results for each task are shown in a summary message.

This multi-select workflow streamlines bulk management and provides clear feedback for each action.

**Task Reminders & Notifications:**

- Assigned users receive automatic reminders and notifications for new tasks, due dates, and completions.
- Reminders sent to assigned users 24 hours before and on the day a task is due.
- Reminder messages include buttons to snooze for 1 hour, snooze for 1 day, or reschedule (via `/task-edit`).
- Reminders are tracked in the database and will not repeat unless snoozed or rescheduled.

**Example reminder message:**

```
:alarm_clock: Task Reminder

## Tech Stack

- Node.js (Express)
- Slack Bolt for JavaScript
- SQLite

## Slash Commands

| Command             | Usage & Arguments                                | Example                                   | Description                            |
| ------------------- | ------------------------------------------------ | ----------------------------------------- | -------------------------------------- |

| Command             | Usage & Arguments                                | Example                                   | Description                            |
| ------------------- | ------------------------------------------------ | ----------------------------------------- | -------------------------------------- |
| `/task`             | _(no arguments needed)_                          | `/task`                                   | Open modal to create and assign a task |
| `/tasks`            | _(none)_                                         | `/tasks`                                  | List all open tasks with interactive buttons |
| `/task-edit`        | `<task id> <new description> [@user] [due date]` | `/task-edit 123 Update docs <@U123456>`   | Edit and assign/reassign a task        |
| `/task-complete`    | _(no arguments needed)_                          | `/task-complete`                          | Open modal to complete one of your tasks |
| `/task-delete`      | _(no arguments needed)_                          | `/task-delete`                            | Open modal to delete a task (admin/all) |

| `/add-admin`        | _(no arguments needed)_                          | `/add-admin`                              | Open modal to add admin privileges (admin only) |
| `/removeadmin`      | _(no arguments needed)_                          | `/removeadmin`                            | Open modal to remove admin privileges (admin only) |
| `/setdigestchannel` | `<channel_id>`                                   | `/setdigestchannel C12345678`             | Set the Slack channel for daily digest |
| `/setconfig`       | _(no arguments needed)_                         | `/setconfig`                             | Open modal to set workspace notification channel and schedule times |
| `/report`         | _(no arguments needed)_                         | `/report`                                | View workspace task analytics and reporting |
| `/listadmins`       | _(no arguments needed)_                          | `/listadmins`                             | Open modal listing all current admins   |

- **Add an admin:**




**Admin Management:**

- `/add-admin`: Opens a modal with a Slack user picker. Select a user to grant admin privileges—no formatting errors, fully interactive.
- **Solo user auto-admin:** If no admins exist, the first user to run `/add-admin` is automatically made an admin. This ensures individuals can self-admin without manual setup.
- `/removeadmin`: Opens a modal with a dropdown picker of current admins. Select an admin to remove—no formatting errors, fully interactive.
- `/listadmins`: Opens a modal listing all current admins in your workspace. Now refactored for professional error handling—no more double ack errors.
- Only current admins can remove other admins.

## Getting Started

1. Clone the repo
2. Install dependencies: `npm install`
3. Set up your Slack app credentials
4. Run locally: `node index.js` (or `npm start`)
5. **Test Block Kit buttons:** Use `/task` or the "Create Task" shortcut. You should see Complete, Edit, and Delete buttons on each task message in Slack. Buttons trigger modals for professional, error-free task management.
6. **Daily digest:** By default, a summary of open tasks is sent to the configured channel every morning at 9am. Use `/setdigestchannel <channel_id>` to change the channel.

## Roadmap



## Upcoming Features

## Roadmap Prioritization

**MVP Critical (Free Tier):**
- Bulk task actions (multi-select, batch complete/delete)
- Task categories, tags, or priorities
- Customizable notification channels
- Workspace-wide settings (reminder times, digest frequency)

**Future Iterations / Premium Tier:**
- Advanced reporting and analytics
- Activity logs and audit trails (now implemented)
- User notification preferences (mute, digest only, etc.)
- Improved mobile UX for modals
- Accessibility enhancements
- Enhanced onboarding and workspace management
- Task comments or threaded discussions
- Integration with external tools (Google Calendar, Trello, etc.)
- Export/import tasks (CSV, JSON)
- API endpoints for external automation
- Admin dashboard for user/task management

See `RELEASE_NOTES.md` for incremental changes and planned features.

## Activity Logs & Audit Trails

- All major actions (task create, edit, complete, delete, batch actions, admin add/remove, config changes) are logged in the activity log.
- Admins can view recent activity using the `/auditlog` Slack command.
- Audit log entries include user, action, details, and timestamp for full traceability.

### Slash Commands
- `/report` — View workspace analytics and reporting (all users)
- `/auditlog` — View recent activity logs (admin only)

## Roadmap Prioritization

**MVP Critical (Free Tier):**
- Bulk task actions (multi-select, batch complete/delete)
- Task categories, tags, or priorities
- Customizable notification channels
- Workspace-wide settings (reminder times, digest frequency)

**Future Iterations:**
- User notification preferences (mute, digest only, etc.)
- Improved mobile UX for modals
- Accessibility enhancements
- Enhanced onboarding and workspace management
- Task comments or threaded discussions
- Integration with external tools (Google Calendar, Trello, etc.)
- Export/import tasks (CSV, JSON)
- API endpoints for external automation
- Admin dashboard for user/task management

See `RELEASE_NOTES.md` for incremental changes and planned features.

---

For details, see the MVP plan in the project description.
```
