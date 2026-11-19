const crypto = require('crypto');

// In-memory stand-in for the Mongoose Review model (only what the routes use).
// Lets the route tests run without a MongoDB server.
function createFakeReviewModel() {
  const store = [];

  const wrap = (doc) => ({
    id: doc.id,
    title: doc.title,
    content: doc.content,
    dateTime: doc.dateTime,
    toJSON: () => ({ id: doc.id, title: doc.title, content: doc.content, dateTime: doc.dateTime }),
  });

  return {
    store,
    async create(data) {
      const id = data._id || crypto.randomBytes(12).toString('hex');
      if (store.some((d) => d.id === id)) {
        const err = new Error('E11000 duplicate key');
        err.code = 11000;
        throw err;
      }
      const doc = {
        id,
        title: data.title,
        content: data.content,
        dateTime: data.dateTime || new Date(),
      };
      store.push(doc);
      return wrap(doc);
    },
    find() {
      return {
        sort: async () =>
          [...store].sort((a, b) => b.dateTime - a.dateTime).map(wrap),
      };
    },
    async findById(id) {
      const doc = store.find((d) => d.id === id);
      return doc ? wrap(doc) : null;
    },
    async findByIdAndUpdate(id, update) {
      const doc = store.find((d) => d.id === id);
      if (!doc) return null;
      Object.assign(doc, update);
      return wrap(doc);
    },
    async findByIdAndDelete(id) {
      const index = store.findIndex((d) => d.id === id);
      if (index < 0) return null;
      const [doc] = store.splice(index, 1);
      return wrap(doc);
    },
  };
}

module.exports = { createFakeReviewModel };