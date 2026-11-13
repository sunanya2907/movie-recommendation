const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  movie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Movie",
    required: true,
  },

  voteType: {
    type: String,
    enum: ["up", "down"],
    required: true,
  },
});

voteSchema.index(
  { user: 1, movie: 1 },
  { unique: true }
);

module.exports = mongoose.model("Vote", voteSchema);