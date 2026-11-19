const express = require('express');
const DefaultReview = require('../models/Review');
const validateObjectId = require('../middleware/validateObjectId');

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

// Router factory so routes can broadcast through the shared Socket.IO instance.
// Events are emitted only after the database operation has succeeded.
// The model is injectable so the routes can be unit-tested without MongoDB.
module.exports = function createReviewRouter(io, Review = DefaultReview) {
  const router = express.Router();

  // Pulls title/content out of the body and validates them.
  // Returns { value } or { error }.
  function readBody(body) {
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const errors = [];
    if (!title) errors.push('Title is required');
    if (!content) errors.push('Content is required');
    if (errors.length) return { error: errors };
    return { value: { title, content } };
  }

  const notFound = (res) =>
    res.status(404).json({ success: false, message: 'Review not found' });

  // GET /api/reviews - latest first
  router.get('/', async (_req, res, next) => {
    try {
      const reviews = await Review.find().sort({ dateTime: -1, _id: -1 });
      res.json({ success: true, data: reviews });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/reviews/restore - used by the Undo action after a delete.
  // Re-creates a deleted review with its ORIGINAL id and date-time so it returns
  // to the same place in the list. Declared before the /:id routes.
  router.post('/restore', async (req, res, next) => {
    try {
      const { id, dateTime } = req.body || {};
      if (typeof id !== 'string' || !OBJECT_ID_PATTERN.test(id)) {
        return res.status(400).json({ success: false, message: 'Invalid review id' });
      }
      const { value, error } = readBody(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.join(', '), errors: error });
      }
      if (await Review.findById(id)) {
        return res.status(409).json({ success: false, message: 'Review already exists' });
      }
      let when = dateTime ? new Date(dateTime) : new Date();
      if (Number.isNaN(when.getTime())) when = new Date();

      const review = await Review.create({ _id: id, ...value, dateTime: when });
      io.emit('review:created', review.toJSON());
      res.status(201).json({ success: true, data: review });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/reviews/:id
  router.get('/:id', validateObjectId, async (req, res, next) => {
    try {
      const review = await Review.findById(req.params.id);
      if (!review) return notFound(res);
      res.json({ success: true, data: review });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/reviews
  router.post('/', async (req, res, next) => {
    try {
      const { value, error } = readBody(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.join(', '), errors: error });
      }
      const review = await Review.create({ ...value, dateTime: new Date() });
      io.emit('review:created', review.toJSON());
      res.status(201).json({ success: true, data: review });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/reviews/:id - also refreshes the date-time
  router.put('/:id', validateObjectId, async (req, res, next) => {
    try {
      const { value, error } = readBody(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.join(', '), errors: error });
      }
      const review = await Review.findByIdAndUpdate(
        req.params.id,
        { ...value, dateTime: new Date() },
        { new: true, runValidators: true }
      );
      if (!review) return notFound(res);
      io.emit('review:updated', review.toJSON());
      res.json({ success: true, data: review });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/reviews/:id
  router.delete('/:id', validateObjectId, async (req, res, next) => {
    try {
      const review = await Review.findByIdAndDelete(req.params.id);
      if (!review) return notFound(res);
      io.emit('review:deleted', { id: review.id });
      res.json({ success: true, data: { id: review.id }, message: 'Review deleted' });
    } catch (err) {
      next(err);
    }
  });

  return router;
};