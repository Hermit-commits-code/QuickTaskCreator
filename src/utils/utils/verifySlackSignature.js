const crypto = require('crypto');

function verifySlackSignature(signingSecret) {
  return (req, res, next) => {
    const slackSignature = req.headers['x-slack-signature'];
    const slackTimestamp = req.headers['x-slack-request-timestamp'];
    if (!slackSignature || !slackTimestamp) {
      return res.status(400).send('Missing Slack signature or timestamp');
    }
    // Prevent replay attacks
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
    if (slackTimestamp < fiveMinutesAgo) {
      return res.status(400).send('Slack request timestamp too old');
    }
    const sigBasestring = `v0:${slackTimestamp}:${req.rawBody}`;
    const mySignature =
      'v0=' +
      crypto
        .createHmac('sha256', signingSecret)
        .update(sigBasestring, 'utf8')
        .digest('hex');
    if (
      !crypto.timingSafeEqual(
        Buffer.from(mySignature, 'utf8'),
        Buffer.from(slackSignature, 'utf8'),
      )
    ) {
      return res.status(400).send('Slack signature verification failed');
    }
    next();
  };
}

module.exports = verifySlackSignature;
