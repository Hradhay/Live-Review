const mongoose = require('mongoose');

const TITLE_MAX = 100;
const CONTENT_MAX = 2000;

const reviewSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [TITLE_MAX, `Title must be at most ${TITLE_MAX} characters`],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      maxlength: [CONTENT_MAX, `Content must be at most ${CONTENT_MAX} characters`],
    },
    // Set on creation and refreshed on every update.
    dateTime: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

reviewSchema.index({ dateTime: -1 });

module.exports = mongoose.model('Review', reviewSchema);