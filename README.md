# Quick Task Creator

Quick Task Creator is a lightweight Slack app for fast, frictionless task creation. Turn any Slack message into a structured task with a slash command or shortcut—no AI, no complex setup.

## Features

- `/task` slash command for instant task creation
- Message shortcut: "Create Task"
- Configurable task channel
- Interactive buttons: Complete, Edit, Delete
- Lightweight storage (SQLite)
- (Optional) Daily digest of open tasks

## Tech Stack

- Node.js (Express)
- Slack Bolt for JavaScript
- SQLite

## Slash Commands

| Command          | Usage & Arguments                                | Example                                | Description             |
| ---------------- | ------------------------------------------------ | -------------------------------------- | ----------------------- |
| `/task`          | `<description> [@user] [due date]`               | `/task Fix login bug @hermit tomorrow` | Create a new task       |
| `/tasks`         | _(none)_                                         | `/tasks`                               | List all open tasks     |
| `/task-edit`     | `<task id> <new description> [@user] [due date]` | `/task-edit 123 Update docs @hermit`   | Edit an existing task   |
| `/task-complete` | `<task id>`                                      | `/task-complete 123`                   | Mark a task as complete |
| `/task-delete`   | `<task id>`                                      | `/task-delete 123`                     | Delete a task           |

## Getting Started

1. Clone the repo
2. Install dependencies: `npm install`
3. Set up your Slack app credentials
4. Run locally: `node index.js` (or `npm start`)

## Roadmap

See `RELEASE_NOTES.md` for incremental changes and planned features.

---

For details, see the MVP plan in the project description.
