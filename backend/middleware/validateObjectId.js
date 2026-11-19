const mongoose = require('mongoose');

// Rejects malformed ids with a 400 before they reach the database.
module.exports = function validateObjectId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid review id' });
  }
  next();
};