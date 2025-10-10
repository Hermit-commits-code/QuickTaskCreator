// /addadmin command handler (modal-based)
const { getAddAdminModal } = require('../blockKit/addAdminModal');
const { getTokenForTeam } = require('../models/workspaceTokensModel');
const { WebClient } = require('@slack/web-api');

module.exports = function (app, db) {
  app.command('/add-admin', async ({ ack, body, client, logger }) => {
    try {
      await ack();
      const workspace_id = body.team_id;
      const channel_id = body.channel_id;
      const user_id = body.user_id;
      if (logger) {
        logger.info(
          `[add-admin] workspace_id: ${workspace_id}, channel_id: ${channel_id}, user_id: ${user_id}`,
        );
      } else {
        console.log(
          '[add-admin] workspace_id:',
          workspace_id,
          'channel_id:',
          channel_id,
          'user_id:',
          user_id,
        );
      }
      getTokenForTeam(workspace_id, async (err, botToken) => {
        if (err || !botToken) {
          if (logger)
            logger.error(
              '[add-admin] No bot token found for workspace:',
              workspace_id,
              err,
            );
          else
            console.error(
              '[add-admin] No bot token found for workspace:',
              workspace_id,
              err,
            );
          await client.chat.postEphemeral({
            channel: channel_id,
            user: user_id,
            text: ':x: App not properly installed for this workspace. Please reinstall.',
          });
          return;
        }
        const realClient = new WebClient(botToken);
        db.get(
          'SELECT COUNT(*) AS count FROM admins WHERE workspace_id = ?',
          [workspace_id],
          async (err, row) => {
            if (err) {
              await realClient.chat.postEphemeral({
                channel: channel_id,
                user: user_id,
                text: '\u2757 Database error. Please try again.',
              });
              return;
            }
            if (row.count === 0) {
              db.run(
                'INSERT INTO admins (user_id, workspace_id) VALUES (?, ?)',
                [user_id, workspace_id],
                function (err2) {
                  if (err2) {
                    realClient.chat.postEphemeral({
                      channel: channel_id,
                      user: user_id,
                      text: '\u2757 Failed to set you as admin. Database error.',
                    });
                  } else {
                    realClient.chat.postEphemeral({
                      channel: channel_id,
                      user: user_id,
                      text: ':white_check_mark: You are now the workspace admin! You can add other admins.',
                    });
                    try {
                      realClient.views.open({
                        trigger_id: body.trigger_id,
                        view: {
                          ...getAddAdminModal(),
                          private_metadata: JSON.stringify({
                            channel_id,
                          }),
                        },
                      });
                    } catch (apiErr) {
                      if (logger)
                        logger.error(
                          '[add-admin] Slack API error (modal open):',
                          apiErr,
                        );
                      else
                        console.error(
                          '[add-admin] Slack API error (modal open):',
                          apiErr,
                        );
                      if (
                        apiErr.data &&
                        apiErr.data.error === 'channel_not_found'
                      ) {
                        realClient.chat.postEphemeral({
                          channel: channel_id,
                          user: user_id,
                          text: ':x: Channel not found or bot is not a member. Please invite the bot to this channel.',
                        });
                      } else if (
                        apiErr.data &&
                        apiErr.data.error === 'user_not_found'
                      ) {
                        realClient.chat.postEphemeral({
                          channel: channel_id,
                          user: user_id,
                          text: ':x: User not found. Please check the user ID.',
                        });
                      } else {
                        realClient.chat.postEphemeral({
                          channel: channel_id,
                          user: user_id,
                          text: ':x: An unexpected error occurred. Please contact support.',
                        });
                      }
                    }
                  }
                },
              );
            } else {
              db.get(
                'SELECT * FROM admins WHERE user_id = ? AND workspace_id = ?',
                [user_id, workspace_id],
                async (err, adminRow) => {
                  if (err || !adminRow) {
                    await realClient.chat.postEphemeral({
                      channel: channel_id,
                      user: user_id,
                      text: '\u2757 Only admins can add other admins.',
                    });
                  } else {
                    try {
                      await realClient.views.open({
                        trigger_id: body.trigger_id,
                        view: {
                          ...getAddAdminModal(),
                          private_metadata: JSON.stringify({
                            channel_id,
                          }),
                        },
                      });
                    } catch (apiErr) {
                      if (logger)
                        logger.error(
                          '[add-admin] Slack API error (modal open):',
                          apiErr,
                        );
                      else
                        console.error(
                          '[add-admin] Slack API error (modal open):',
                          apiErr,
                        );
                      if (
                        apiErr.data &&
                        apiErr.data.error === 'channel_not_found'
                      ) {
                        realClient.chat.postEphemeral({
                          channel: channel_id,
                          user: user_id,
                          text: ':x: Channel not found or bot is not a member. Please invite the bot to this channel.',
                        });
                      } else if (
                        apiErr.data &&
                        apiErr.data.error === 'user_not_found'
                      ) {
                        realClient.chat.postEphemeral({
                          channel: channel_id,
                          user: user_id,
                          text: ':x: User not found. Please check the user ID.',
                        });
                      } else {
                        realClient.chat.postEphemeral({
                          channel: channel_id,
                          user: user_id,
                          text: ':x: An unexpected error occurred. Please contact support.',
                        });
                      }
                    }
                  }
                },
              );
            }
          },
        );
      });
    } catch (error) {
      if (logger) logger.error('[add-admin] error:', error);
      else console.error('/add-admin error:', error);
      await client.chat.postEphemeral({
        channel: body.channel_id,
        user: body.user_id,
        text: ':x: Internal error. Please try again later.',
      });
    }
  });

  // Modal submission handler
  app.view('add_admin_modal_submit', async ({ ack, body, view, client }) => {
    await ack();
    const user = body.user.id;
    const selectedUser = view.state.values.user_block.user_select.selected_user;
    const workspaceId = body.team.id || body.team_id;
    // Get channel_id from private_metadata
    let channel_id = null;
    try {
      if (view.private_metadata) {
        const meta = JSON.parse(view.private_metadata);
        if (meta.channel_id) channel_id = meta.channel_id;
      }
    } catch (e) {}
    getTokenForTeam(workspaceId, async (err, botToken) => {
      if (err || !botToken) {
        console.error('No bot token found for workspace:', workspaceId, err);
        return;
      }
      const realClient = new WebClient(botToken);
      // Prevent duplicate admin entries
      db.get(
        'SELECT * FROM admins WHERE user_id = ? AND workspace_id = ?',
        [selectedUser, workspaceId],
        function (err, row) {
          if (row) {
            realClient.chat.postEphemeral({
              channel: channel_id,
              user,
              text: `:information_source: <@${selectedUser}> is already an admin for this workspace.`,
            });
            return;
          }
          db.run(
            'INSERT INTO admins (user_id, workspace_id) VALUES (?, ?)',
            [selectedUser, workspaceId],
            function (err2) {
              const { logActivity } = require('../models/activityLogModel');
              logActivity(
                user,
                'add_admin',
                `Admin privileges granted to <@${selectedUser}>`,
              );
              if (err2) {
                realClient.chat.postEphemeral({
                  channel: channel_id,
                  user,
                  text: '\u2757 Failed to add admin. Database error.',
                });
              } else {
                realClient.chat.postEphemeral({
                  channel: channel_id,
                  user,
                  text: `:white_check_mark: Admin privileges granted to <@${selectedUser}>.`,
                });
              }
            },
          );
        },
      );
    });
  });
};
