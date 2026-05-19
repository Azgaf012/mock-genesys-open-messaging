'use strict';

const express = require('express');

const app = express();
const PORT = process.env.PORT ?? 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Helper: structured log ──────────────────────────────────────────────────
function log(level, message, data) {
  const entry = {
    level,
    ts: new Date().toISOString(),
    message,
    ...(data !== undefined ? { data } : {})
  };
  console.log(JSON.stringify(entry, null, 2));
}

// ── POST /api/v2/conversations/messages/:integrationId/inbound/open/message ──
app.post(
  '/api/v2/conversations/messages/:integrationId/inbound/open/message',
  (req, res) => {
    const { integrationId } = req.params;
    const body = req.body;

    // ── Log everything ──────────────────────────────────────────────────────
    log('INFO', 'Inbound Open Messaging request received', {
      integrationId,
      headers: {
        authorization: req.headers['authorization']
          ? req.headers['authorization'].replace(/Bearer\s+\S+/, 'Bearer [REDACTED]')
          : undefined,
        'content-type': req.headers['content-type']
      },
      body
    });

    // ── Validate required field ─────────────────────────────────────────────
    if (!body || !body.channel) {
      const errorResponse = {
        title: 'Bad Request',
        detail: 'Missing required field: channel',
        instance: req.path,
        type: 'https://developer.genesys.cloud/api/rest/v2/errors/bad-request'
      };
      log('WARN', 'Request rejected — missing required field: channel', { integrationId });
      return res.status(400).json(errorResponse);
    }

    // ── Build and return a response that mirrors the spec ───────────────────
    const response = {
      id: body.channel.messageId ?? crypto.randomUUID(),
      channel: body.channel,
      type: 'TEXT',
      text: body.text ?? ''
    };

    log('INFO', 'Responding 200 OK', { integrationId, responseId: response.id });

    return res.status(200).json(response);
  }
);

// ── 404 catch-all ───────────────────────────────────────────────────────────
app.use((req, res) => {
  log('WARN', '404 Not Found', { method: req.method, path: req.path });
  res.status(404).json({ title: 'Not Found', detail: `${req.method} ${req.path}` });
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  log('INFO', `Mock Genesys Open Messaging server running on port ${PORT}`, {
    endpoint: `POST http://localhost:${PORT}/api/v2/conversations/messages/:integrationId/inbound/open/message`
  });
});
