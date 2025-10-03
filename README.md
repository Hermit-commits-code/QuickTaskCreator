# Quick Task Creator

[![Version](https://img.shields.io/badge/version-v1.10.1-blue)](https://github.com/Hermit-commits-code/QuickTaskCreator/releases)
[![Slack Ready](https://img.shields.io/badge/slack-ready-blue)](https://slack.com/apps)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Slash Commands](#slash-commands)
- [Accessibility & Mobile UX](#accessibility--mobile-ux)
- [Admin Management](#admin-management)
- [Roadmap](#roadmap)
- [Support & Feedback](#support--feedback)
- [Tech Stack](#tech-stack)
- [License](#license)
- [Analytics & Privacy](#analytics--privacy)

---

## Overview

Quick Task Creator is a professional, frictionless Slack app for structured task management. Create, assign, and manage tasks directly in Slack using interactive modals and buttons. No AI, no complex setup—just fast, reliable workflows.

---

## Features

### Free Tier

- Modal-based task creation, editing, completion, and deletion
- Bulk task actions (multi-select, batch complete/delete)
- Task categories, tags, priorities
- Customizable notification channels and workspace-wide settings
- Daily digest and reminders
- Admin controls (add/remove/list admins)
- Activity logs and audit trails
- SQLite backend and Slack Bolt integration
- Professional error handling and user feedback
- Accessibility enhancements (screen reader friendly, tab navigation, clear instructions)
- Mobile UX improvements (optimized for Slack mobile)
- In-app help and usage hints for all commands
- Easy Slack app install and onboarding
- In-app support command (`/help` or `/support`)
- Feedback loop for feature requests and bug reports
- Automated onboarding emails/messages
- Feature updates/tips sent via Slack

### Premium Tier (Coming Soon)

- Advanced reporting and analytics
- Admin dashboard for user/task management
- Task comments or threaded discussions
- Export/import tasks (CSV, JSON)
- Integration with external tools (Google Calendar, Trello, etc.)
- API endpoints for external automation
- Enhanced onboarding and workspace management
- Usage analytics (track active workspaces, users, tasks)

---

## Getting Started

1. Clone the repo
2. Install dependencies: `npm install`
3. Set up your Slack app credentials
4. Run locally: `node index.js` (or `npm start`)
5. Use `/task` or the "Create Task" shortcut in Slack to get started
6. Configure your daily digest channel with `/setdigestchannel <channel_id>`

---

## Easy Slack App Install & Onboarding

### Step-by-Step Installation

1. **Create a Slack App:**
   - Go to [Slack API: Create an App](https://api.slack.com/apps?new_app=1)
   - Choose "From scratch" and name your app (e.g., Quick Task Creator)
   - Select your workspace
2. **Configure OAuth & Permissions:**
   - Add required OAuth scopes: `commands`, `chat:write`, `users:read`, `channels:read`, `groups:read`, `im:read`, `mpim:read`
   - Enable Interactivity & Shortcuts, set your Request URL to your hosted endpoint (e.g., https://yourapp.com/slack/events)
   - Add slash commands: `/task`, `/tasks`, `/task-edit`, `/task-complete`, `/task-delete`, `/add-admin`, `/removeadmin`, `/setdigestchannel`, `/setconfig`, `/report`, `/listadmins`, `/notifyprefs`, `/help`, `/support`
3. **Install the App to Your Workspace:**
   - Go to "Install App" in Slack app settings
   - Click "Install to Workspace" and authorize
   - Copy your OAuth tokens and signing secret
4. **Set Environment Variables:**
   - Create a `.env` file or set environment variables:
     - `SLACK_BOT_TOKEN`
     - `SLACK_SIGNING_SECRET`
     - `DATABASE_URL` (optional, defaults to SQLite)
5. **Run the App Locally or Deploy:**
   - Start with `node index.js` or `npm start`
   - Use [ngrok](https://ngrok.com/) for local development: `ngrok http 3000` and update Slack URLs
   - For production, deploy to Heroku, Render, Railway, or your own server
6. **Onboarding Experience:**
   - First-time users see a welcome message with usage tips
   - Use `/help` for a quick guide to all commands

---

## Slash Commands

| Command               | Usage & Arguments                                | Example                                 | Description                                                         |
| --------------------- | ------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------- |
| `/task`               | _(no arguments needed)_                          | `/task`                                 | Open modal to create and assign a task                              |
| `/tasks`              | _(none)_                                         | `/tasks`                                | List all open tasks with interactive buttons                        |
| `/task-edit`          | `<task id> <new description> [@user] [due date]` | `/task-edit 123 Update docs <@U123456>` | Edit and assign/reassign a task                                     |
| `/task-complete`      | _(no arguments needed)_                          | `/task-complete`                        | Open modal to complete one of your tasks                            |
| `/task-delete`        | _(no arguments needed)_                          | `/task-delete`                          | Open modal to delete a task (admin/all)                             |
| `/add-admin`          | _(no arguments needed)_                          | `/add-admin`                            | Open modal to add admin privileges                                  |
| `/removeadmin`        | _(no arguments needed)_                          | `/removeadmin`                          | Open modal to remove admin privileges                               |
| `/setdigestchannel`   | `<channel_id>`                                   | `/setdigestchannel C12345678`           | Set the Slack channel for daily digest                              |
| `/setconfig`          | _(no arguments needed)_                          | `/setconfig`                            | Open modal to set workspace notification channel and schedule times |
| `/report`             | _(no arguments needed)_                          | `/report`                               | View workspace task analytics and reporting                         |
| `/listadmins`         | _(no arguments needed)_                          | `/listadmins`                           | Open modal listing all current admins                               |
| `/notifyprefs`        | _(no arguments needed)_                          | `/notifyprefs`                          | Set your notification preferences                                   |
| `/help` or `/support` | _(no arguments needed)_                          | `/help`                                 | Get in-app help and support                                         |

---

## Accessibility & Mobile UX

- All modals and workflows are designed for screen reader compatibility and keyboard navigation
- Clear, descriptive labels and instructions
- Optimized layouts for Slack mobile app

---

## Admin Management

- Add, remove, and list admins with dedicated modals
- Solo user auto-admin logic for easy setup
- Only current admins can remove other admins

---

## Roadmap

See `ROADMAP.md` for full details and prioritization.

- Free Tier: All features above
- Premium Tier: Advanced analytics, integrations, usage analytics, and more (coming soon)

---

## Support & Feedback

- Use `/help` or `/support` in Slack for instant help
- Submit feature requests and bug reports via Slack or GitHub Issues
- Automated onboarding and feature tips sent via Slack

---

## Tech Stack

- Node.js (Express)
- Slack Bolt for JavaScript
- SQLite

---

## License

MIT © 2025 Hermit-commits-code

---

## Analytics & Privacy

Quick Task Creator tracks basic usage analytics to help improve the app and understand feature adoption. This includes:

- Active workspaces and users
- Command usage (task creation, editing, completion, deletion, audit log, etc.)
- No personal message content or sensitive data is stored
- A privacy disclaimer is shown to users on onboarding
- Contact support to opt out of analytics tracking
