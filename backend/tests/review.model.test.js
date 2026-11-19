const test = require('node:test');
const assert = require('node:assert/strict');
const Review = require('../models/Review');

const messages = (err) => Object.values(err.errors).map((e) => e.message);

test('Review model: title and content are required', async () => {
  const err = await new Review({}).validate().catch((e) => e);
  assert.deepEqual(messages(err).sort(), ['Content is required', 'Title is required']);
});

test('Review model: whitespace-only values are rejected after trimming', async () => {
  const err = await new Review({ title: '   ', content: '\n\t' }).validate().catch((e) => e);
  assert.equal(err.name, 'ValidationError');
  assert.equal(Object.keys(err.errors).length, 2);
});

test('Review model: title longer than 100 characters is rejected', async () => {
  const err = await new Review({ title: 'x'.repeat(101), content: 'ok' })
    .validate()
    .catch((e) => e);
  assert.deepEqual(messages(err), ['Title must be at most 100 characters']);
});

test('Review model: content longer than 2000 characters is rejected', async () => {
  const err = await new Review({ title: 'ok', content: 'x'.repeat(2001) })
    .validate()
    .catch((e) => e);
  assert.deepEqual(messages(err), ['Content must be at most 2000 characters']);
});

test('Review model: boundary lengths (100 / 2000) are accepted', async () => {
  await new Review({ title: 'x'.repeat(100), content: 'y'.repeat(2000) }).validate();
});

test('Review model: trims values and defaults dateTime', async () => {
  const review = new Review({ title: '  Hello  ', content: '  World  ' });
  await review.validate();
  assert.equal(review.title, 'Hello');
  assert.equal(review.content, 'World');
  assert.ok(review.dateTime instanceof Date);
});

test('Review model: JSON output exposes id and hides _id', () => {
  const json = new Review({ title: 'A', content: 'B' }).toJSON();
  assert.equal(typeof json.id, 'string');
  assert.equal(json.id.length, 24);
  assert.equal('_id' in json, false);
  assert.deepEqual(Object.keys(json).sort(), ['content', 'dateTime', 'id', 'title']);
});

test('Review model: accepts an explicit _id and dateTime (used by Undo)', () => {
  const id = '64b7f0f2a1b2c3d4e5f60718';
  const when = new Date('2026-01-02T03:04:05.000Z');
  const json = new Review({ _id: id, title: 'A', content: 'B', dateTime: when }).toJSON();
  assert.equal(json.id, id);
  assert.equal(json.dateTime.toISOString(), when.toISOString());
});