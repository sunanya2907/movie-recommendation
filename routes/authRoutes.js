
const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Google Login
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google OAuth Callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/",
    session: false,
  }),

  (req, res) => {
    try {
      // Generate JWT Token
      const token = jwt.sign(
        {
          id: req.user._id.toString(),
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "1d",
        }
      );

      // User Details
      const userData = {
        id: req.user._id.toString(),
        name: req.user.name,
        email: req.user.email,
      };

      // Safely prepare data for the script
      const safeToken = JSON.stringify(token).replace(/</g, "\\u003c");
      const safeUser = JSON.stringify(userData).replace(/</g, "\\u003c");

      // Send response and redirect
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <title>Login Successful</title>
          </head>

          <body>
            <h2>Google Login Successful!</h2>
            <p>Redirecting to Movie Recommendation Vault...</p>

            <script>
              localStorage.setItem("token", ${safeToken});
              localStorage.setItem("user", ${safeUser});

              window.location.replace("/");
            </script>
          </body>
        </html>
      `);

    } catch (error) {
      console.error("Google Login Error:", error.message);

      res.status(500).send("Login failed. Please try again.");
    }
  }
);

module.exports = router;
