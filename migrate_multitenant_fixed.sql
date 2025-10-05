-- Fixed migration script for multi-tenant support in QuickTaskCreator
-- Adds workspace_id to tables and fixes column name typo in admins

-- Add workspace_id to settings
ALTER TABLE settings ADD COLUMN workspace_id TEXT;

-- Add workspace_id to activity_log
ALTER TABLE activity_log ADD COLUMN workspace_id TEXT;

-- Add workspace_id to notification_preferences
ALTER TABLE notification_preferences ADD COLUMN workspace_id TEXT;

-- Add workspace_id to bug_reports
ALTER TABLE bug_reports ADD COLUMN workspace_id TEXT;

-- Fix column name typo in admins (workspac e_id)
PRAGMA foreign_keys=off;
BEGIN TRANSACTION;
CREATE TABLE admins_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL
);
INSERT INTO admins_new (id, user_id, workspace_id)
    SELECT id, user_id, "workspac e_id" FROM admins;
DROP TABLE admins;
ALTER TABLE admins_new RENAME TO admins;
COMMIT;
PRAGMA foreign_keys=on;

-- Optional: Set workspace_id to a default value for existing rows
-- UPDATE settings SET workspace_id = 'default';
-- UPDATE activity_log SET workspace_id = 'default';
-- UPDATE notification_preferences SET workspace_id = 'default';
-- UPDATE bug_reports SET workspace_id = 'default';
-- UPDATE admins SET workspace_id = 'default';

-- Review and update these default values as needed for your app.
