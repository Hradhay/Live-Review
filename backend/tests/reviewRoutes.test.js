const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const express = require('express');
const createReviewRouter = require('../routes/reviewRoutes');
const { notFound, errorHandler } = require('../middleware/errorHandler');
const { createFakeReviewModel } = require('./helpers/fakeReviewModel');

const MISSING_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

// Starts a real HTTP server around the real router, with a fake model and a fake io.
async function startApp() {
  const model = createFakeReviewModel();
  const emitted = [];
  const io = { emit: (event, payload) => emitted.push({ event, payload }) };

  const app = express();
  app.use(express.json());
  app.use('/api/reviews', createReviewRouter(io, model));
  app.use(notFound);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/reviews`;

  async function call(method, path, body) {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  }

  return {
    call,
    emitted,
    model,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function withApp(name, fn) {
  test(name, async () => {
    const app = await startApp();
    try {
      await fn(app);
    } finally {
      await app.close();
    }
  });
}

withApp('POST creates a trimmed review, returns 201 and emits review:created', async (app) => {
  const res = await app.call('POST', '', { title: '  Hello ', content: ' World ' });
  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.title, 'Hello');
  assert.equal(res.body.data.content, 'World');
  assert.ok(res.body.data.id);
  assert.ok(res.body.data.dateTime);
  assert.equal(app.emitted.length, 1);
  assert.equal(app.emitted[0].event, 'review:created');
  assert.equal(app.emitted[0].payload.id, res.body.data.id);
});

withApp('POST validation failures return 400 and emit nothing', async (app) => {
  for (const body of [{}, { title: '', content: 'x' }, { title: 'x' }, { title: 1, content: {} }]) {
    const res = await app.call('POST', '', body);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  }
  assert.equal(app.emitted.length, 0);
});

withApp('GET list returns latest review first', async (app) => {
  const first = await app.call('POST', '', { title: 'first', content: 'a' });
  await new Promise((r) => setTimeout(r, 5));
  const second = await app.call('POST', '', { title: 'second', content: 'b' });
  const res = await app.call('GET', '');
  assert.equal(res.status, 200);
  assert.deepEqual(
    res.body.data.map((r) => r.id),
    [second.body.data.id, first.body.data.id]
  );
});

withApp('GET one: 200 for existing, 400 for malformed id, 404 for missing', async (app) => {
  const created = await app.call('POST', '', { title: 'a', content: 'b' });
  assert.equal((await app.call('GET', `/${created.body.data.id}`)).status, 200);
  assert.equal((await app.call('GET', '/not-an-id')).status, 400);
  assert.equal((await app.call('GET', `/${MISSING_ID}`)).status, 404);
});

withApp('PUT updates the review, refreshes dateTime and emits review:updated', async (app) => {
  const created = await app.call('POST', '', { title: 'old', content: 'old' });
  const id = created.body.data.id;
  await new Promise((r) => setTimeout(r, 5));

  const res = await app.call('PUT', `/${id}`, { title: 'new', content: 'new body' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.title, 'new');
  assert.ok(new Date(res.body.data.dateTime) > new Date(created.body.data.dateTime));

  const events = app.emitted.map((e) => e.event);
  assert.deepEqual(events, ['review:created', 'review:updated']);
});

withApp('PUT: 400 for invalid body, 400 for bad id, 404 for missing; none emit', async (app) => {
  const created = await app.call('POST', '', { title: 'a', content: 'b' });
  app.emitted.length = 0;
  assert.equal((await app.call('PUT', `/${created.body.data.id}`, { title: '', content: '' })).status, 400);
  assert.equal((await app.call('PUT', '/bad', { title: 'a', content: 'b' })).status, 400);
  assert.equal((await app.call('PUT', `/${MISSING_ID}`, { title: 'a', content: 'b' })).status, 404);
  assert.equal(app.emitted.length, 0);
});

withApp('DELETE removes the review and emits review:deleted with the id', async (app) => {
  const created = await app.call('POST', '', { title: 'a', content: 'b' });
  const id = created.body.data.id;
  const res = await app.call('DELETE', `/${id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.id, id);
  assert.deepEqual(app.emitted.at(-1), { event: 'review:deleted', payload: { id } });
  assert.equal((await app.call('GET', `/${id}`)).status, 404);
});

withApp('DELETE: 404 when already deleted, 400 for bad id; no extra events', async (app) => {
  const created = await app.call('POST', '', { title: 'a', content: 'b' });
  const id = created.body.data.id;
  await app.call('DELETE', `/${id}`);
  const before = app.emitted.length;
  assert.equal((await app.call('DELETE', `/${id}`)).status, 404);
  assert.equal((await app.call('DELETE', '/bad')).status, 400);
  assert.equal(app.emitted.length, before);
});

withApp('RESTORE (Undo) re-creates a deleted review with its original id and dateTime', async (app) => {
  const created = await app.call('POST', '', { title: 'keep me', content: 'body' });
  const original = created.body.data;
  await app.call('DELETE', `/${original.id}`);
  assert.equal((await app.call('GET', `/${original.id}`)).status, 404);

  const res = await app.call('POST', '/restore', original);
  assert.equal(res.status, 201);
  assert.equal(res.body.data.id, original.id);
  assert.equal(new Date(res.body.data.dateTime).toISOString(), new Date(original.dateTime).toISOString());

  const fetched = await app.call('GET', `/${original.id}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.data.title, 'keep me');

  assert.deepEqual(
    app.emitted.map((e) => e.event),
    ['review:created', 'review:deleted', 'review:created']
  );
  assert.equal(app.emitted.at(-1).payload.id, original.id);
});

withApp('RESTORE rejects an existing review with 409 and emits nothing', async (app) => {
  const created = await app.call('POST', '', { title: 'a', content: 'b' });
  const before = app.emitted.length;
  const res = await app.call('POST', '/restore', created.body.data);
  assert.equal(res.status, 409);
  assert.equal(app.emitted.length, before);
});

withApp('RESTORE validates id and body', async (app) => {
  const valid = { id: MISSING_ID, title: 'a', content: 'b', dateTime: new Date().toISOString() };
  assert.equal((await app.call('POST', '/restore', { ...valid, id: undefined })).status, 400);
  assert.equal((await app.call('POST', '/restore', { ...valid, id: 'short' })).status, 400);
  assert.equal((await app.call('POST', '/restore', { ...valid, title: '' })).status, 400);
  assert.equal(app.emitted.length, 0);
});

withApp('RESTORE falls back to now when dateTime is missing or invalid', async (app) => {
  const res1 = await app.call('POST', '/restore', { id: MISSING_ID, title: 'a', content: 'b' });
  assert.equal(res1.status, 201);
  assert.ok(!Number.isNaN(new Date(res1.body.data.dateTime).getTime()));

  const res2 = await app.call('POST', '/restore', {
    id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    title: 'a',
    content: 'b',
    dateTime: 'garbage',
  });
  assert.equal(res2.status, 201);
  assert.ok(!Number.isNaN(new Date(res2.body.data.dateTime).getTime()));
});

withApp('unknown routes return a JSON 404', async (app) => {
  const res = await app.call('GET', '/x/y/z');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});