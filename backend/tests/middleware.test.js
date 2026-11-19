const test = require('node:test');
const assert = require('node:assert/strict');
const validateObjectId = require('../middleware/validateObjectId');
const { notFound, errorHandler } = require('../middleware/errorHandler');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('validateObjectId: rejects a malformed id with 400', () => {
  const res = mockRes();
  let called = false;
  validateObjectId({ params: { id: 'not-an-id' } }, res, () => (called = true));
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(called, false);
});

test('validateObjectId: lets a valid ObjectId through', () => {
  const res = mockRes();
  let called = false;
  validateObjectId({ params: { id: '64b7f0f2a1b2c3d4e5f60718' } }, res, () => (called = true));
  assert.equal(called, true);
  assert.equal(res.statusCode, null);
});

test('notFound: returns a 404 JSON body naming the route', () => {
  const res = mockRes();
  notFound({ method: 'GET', originalUrl: '/nope' }, res);
  assert.equal(res.statusCode, 404);
  assert.match(res.body.message, /GET \/nope/);
});

test('errorHandler: maps Mongoose validation errors to 400', () => {
  const res = mockRes();
  const err = { name: 'ValidationError', errors: { title: { message: 'Title is required' } } };
  errorHandler(err, {}, res, () => {});
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body.errors, ['Title is required']);
});

test('errorHandler: maps duplicate key errors to 409', () => {
  const res = mockRes();
  errorHandler({ code: 11000 }, {}, res, () => {});
  assert.equal(res.statusCode, 409);
});

test('errorHandler: maps malformed JSON to 400', () => {
  const res = mockRes();
  errorHandler({ type: 'entity.parse.failed' }, {}, res, () => {});
  assert.equal(res.statusCode, 400);
});

test('errorHandler: unknown errors become a generic 500', (t) => {
  t.mock.method(console, 'error', () => {});
  const res = mockRes();
  errorHandler(new Error('boom'), {}, res, () => {});
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, 'Internal server error');
});