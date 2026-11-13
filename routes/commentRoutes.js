
const express = require("express");
const Comment = require("../models/Comment");
const Movie = require("../models/Movie");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ADD comment to a movie
router.post(
  "/:movieId/comments",
  protect,
  async (req, res) => {
    try {
      const { text } = req.body;

      const movie = await Movie.findById(
        req.params.movieId
      );

      if (!movie) {
        return res.status(404).json({
          message: "Movie not found",
        });
      }

      if (!text || !text.trim()) {
        return res.status(400).json({
          message: "Comment cannot be empty",
        });
      }

      const comment = await Comment.create({
        movie: movie._id,
        user: req.user._id,
        text: text.trim(),
      });

      res.status(201).json(comment);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

// GET comments for a movie
router.get("/:movieId/comments", async (req, res) => {
  try {
    const comments = await Comment.find({
      movie: req.params.movieId,
    })
      .populate("user", "name picture")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// UPDATE own comment
router.put("/:id", protect, async (req, res) => {
  try {
    const comment = await Comment.findById(
      req.params.id
    );

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (
      comment.user.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "You cannot edit this comment",
      });
    }

    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        message: "Comment cannot be empty",
      });
    }

    comment.text = text.trim();

    await comment.save();

    res.json({
      message: "Comment updated",
      comment,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// DELETE own comment
router.delete("/:id", protect, async (req, res) => {
  try {
    const comment = await Comment.findById(
      req.params.id
    );

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (
      comment.user.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "You cannot delete this comment",
      });
    }

    await comment.deleteOne();

    res.json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;
