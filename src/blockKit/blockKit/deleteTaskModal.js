// Block Kit modal for deleting a task with optional reason
function getDeleteTaskModal(tasks, selectedTaskId) {
  // Find the selected task object
  let selectedTask = null;
  if (selectedTaskId) {
    selectedTask = tasks.find(
      (t) => String(t._id || t.id) === String(selectedTaskId),
    );
  }
  return {
    type: 'modal',
    callback_id: 'delete_task_modal_submit',
    title: {
      type: 'plain_text',
      text: 'Delete Task',
    },
    submit: {
      type: 'plain_text',
      text: 'Delete',
    },
    close: {
      type: 'plain_text',
      text: 'Cancel',
    },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Delete Task*\n_All fields are accessible. Use Tab to navigate. Labels and placeholders are screen reader friendly._',
        },
      },
      {
        type: 'input',
        block_id: 'task_block',
        element: {
          type: 'static_select',
          action_id: 'task_select',
          placeholder: {
            type: 'plain_text',
            text: 'Select a task to delete. (Screen reader: Task select input)',
          },
          options: tasks.map((task) => ({
            text: {
              type: 'plain_text',
              text: `${task.description} (Due: ${task.due_date || 'N/A'})`,
            },
            value: String(task._id || task.id),
          })),
          ...(selectedTaskId
            ? {
                initial_option: {
                  text: {
                    type: 'plain_text',
                    text:
                      selectedTask && selectedTask.description
                        ? `${selectedTask.description} (Due: ${
                            selectedTask.due_date || 'N/A'
                          })`
                        : '',
                  },
                  value: String(selectedTaskId),
                },
              }
            : {}),
        },
        label: {
          type: 'plain_text',
          text: 'Task (required)',
        },
        hint: {
          type: 'plain_text',
          text: 'Select the task to delete. Accessible for screen readers.',
        },
      },
      {
        type: 'input',
        block_id: 'reason_block',
        element: {
          type: 'plain_text_input',
          action_id: 'reason_input',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'Reason (optional)',
          },
        },
        label: {
          type: 'plain_text',
          text: 'Reason',
        },
        optional: true,
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Optional Details*',
        },
      },
      {
        type: 'input',
        block_id: 'category_block',
        element: {
          type: 'plain_text_input',
          action_id: 'category_input',
          placeholder: {
            type: 'plain_text',
            text: 'Category (e.g. Bug)',
          },
          ...(selectedTask && selectedTask.category
            ? { initial_value: selectedTask.category }
            : {}),
        },
        label: {
          type: 'plain_text',
          text: 'Category',
        },
        optional: true,
      },
      {
        type: 'input',
        block_id: 'tags_block',
        element: {
          type: 'plain_text_input',
          action_id: 'tags_input',
          placeholder: {
            type: 'plain_text',
            text: 'Tags (comma-separated)',
          },
          ...(selectedTask && selectedTask.tags
            ? {
                initial_value: Array.isArray(selectedTask.tags)
                  ? selectedTask.tags.join(', ')
                  : selectedTask.tags,
              }
            : {}),
        },
        label: {
          type: 'plain_text',
          text: 'Tags',
        },
        optional: true,
      },
      {
        type: 'input',
        block_id: 'priority_block',
        element: {
          type: 'static_select',
          action_id: 'priority_select',
          placeholder: {
            type: 'plain_text',
            text: 'Priority',
          },
          options: [
            { text: { type: 'plain_text', text: 'Low' }, value: 'Low' },
            { text: { type: 'plain_text', text: 'Medium' }, value: 'Medium' },
            { text: { type: 'plain_text', text: 'High' }, value: 'High' },
          ],
          ...(selectedTask && selectedTask.priority
            ? {
                initial_option: {
                  text: { type: 'plain_text', text: selectedTask.priority },
                  value: selectedTask.priority,
                },
              }
            : {}),
        },
        label: {
          type: 'plain_text',
          text: 'Priority',
        },
        optional: true,
      },
    ],
  };
}

module.exports = { getDeleteTaskModal };
