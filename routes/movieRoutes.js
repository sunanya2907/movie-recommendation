
const express = require("express");
const Movie = require("../models/Movie");
const Vote = require("../models/Vote");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// GET all movies with filtering and sorting
router.get("/", async (req, res) => {
  try {
    const { genre, sort } = req.query;

    let filter = {};

    if (genre && genre !== "All") {
      filter.genre = genre;
    }

    let sortOption = { createdAt: -1 };

    if (sort === "popularity") {
      sortOption = { voteScore: -1 };
    }

    const movies = await Movie.find(filter)
      .populate("recommendedBy", "name")
      .sort(sortOption);

    res.json(movies);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// ADD a movie
router.post("/", protect, async (req, res) => {
  try {
    const {
      title,
      description,
      genre,
      releaseYear,
      poster,
    } = req.body;

    const movie = await Movie.create({
      title,
      description,
      genre,
      releaseYear,
      poster,
      recommendedBy: req.user._id,
    });

    res.status(201).json(movie);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// VOTE on a movie
router.post("/:id/vote", protect, async (req, res) => {
  try {
    const { voteType } = req.body;

    if (!["up", "down"].includes(voteType)) {
      return res.status(400).json({
        message: "Vote must be up or down",
      });
    }

    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        message: "Movie not found",
      });
    }

    let existingVote = await Vote.findOne({
      user: req.user._id,
      movie: movie._id,
    });

    let scoreChange;

    if (!existingVote) {
      await Vote.create({
        user: req.user._id,
        movie: movie._id,
        voteType,
      });

      scoreChange = voteType === "up" ? 1 : -1;
    } else {
      if (existingVote.voteType === voteType) {
        return res.status(400).json({
          message: "You have already cast this vote",
        });
      }

      scoreChange = voteType === "up" ? 2 : -2;

      existingVote.voteType = voteType;
      await existingVote.save();
    }

    movie.voteScore += scoreChange;
    await movie.save();

    res.json({
      message: "Vote recorded",
      voteScore: movie.voteScore,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;
