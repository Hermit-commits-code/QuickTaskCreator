# Quick Task Creator Roadmap

## Current Features

- `/task` command for task creation
- `/tasks` to list open tasks
- `/task-edit`, `/task-complete`, `/task-delete` for task management
- SQLite storage
- Slack Bolt integration
- Assign tasks to users in the channel (via @mention in `/task` or `/task-edit`)

## Upcoming Features

- Message shortcut: "Create Task" from any Slack message
- Interactive buttons for Complete, Edit, Delete
- Configurable task channel
- Daily digest of open tasks
- Improved formatting with Slack Block Kit
- Error handling and admin controls

## Assigning Tasks to Users

- **Implemented:**
  - When a user is @mentioned in the `/task` or `/task-edit` command, their Slack user ID is parsed and stored in the `assigned_user` field in the database.
  - The app displays the assigned user in the task message (e.g., `Assigned to: @hermit`).
  - Future: Add interactive assignment via buttons or dropdowns.

**Status:** Complete for MVP. Backend parsing and display of assigned users is live.
