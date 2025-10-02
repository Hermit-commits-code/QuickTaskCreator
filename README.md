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

**Task Picker Modals:**

- `/task-complete` and `/task-delete` now open modals with a dropdown picker listing your open tasks (or all open tasks for admins). No need to remember task IDs—just select from the list.
- `/task-edit` opens a modal with a dropdown picker of your open tasks, plus editable fields for description and due date. Update any field and save changes instantly.
- All picker modals are context-aware: only relevant tasks are shown, and admin permissions are respected.

**Example Modal Workflow:**

1. Type `/task-complete` in Slack.
2. A modal appears with a dropdown of your open tasks. Select the task and submit to mark it complete.
3. Type `/task-delete` (admin only) to see a modal listing all open tasks. Select and confirm deletion.
4. Type `/task-edit` to open a modal with a picker and editable fields. Select a task, update description/due date, and save.

This picker-based workflow eliminates errors, speeds up task management, and provides a professional user experience.

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

| `/removeadmin`      | `<@user>`                                       | `/removeadmin <@U12345678>`               | Remove admin privileges (admin only)   |
| `/setdigestchannel` | `<channel_id>`                                   | `/setdigestchannel C12345678`             | Set the Slack channel for daily digest |

- **Add an admin:**

**Add or Remove an Admin:**

```

/addadmin <@username>
/removeadmin <@username>

```

- Only current admins can remove other admins.
- You can select a user from Slack autocomplete (which inserts a mention like <@U12345678>), or type @username directly.
- The app will resolve either format to the correct user ID.

## Getting Started

1. Clone the repo
2. Install dependencies: `npm install`
3. Set up your Slack app credentials
4. Run locally: `node index.js` (or `npm start`)
5. **Test Block Kit buttons:** Use `/task` or the "Create Task" shortcut. You should see Complete, Edit, and Delete buttons on each task message in Slack. Buttons trigger modals for professional, error-free task management.
6. **Daily digest:** By default, a summary of open tasks is sent to the configured channel every morning at 9am. Use `/setdigestchannel <channel_id>` to change the channel.

## Roadmap

## Upcoming Features

- Advanced reporting and analytics
- Activity logs and audit trails
- Customizable notification channels
- Enhanced onboarding and workspace management


See `RELEASE_NOTES.md` for incremental changes and planned features.

---

For details, see the MVP plan in the project description.
```
