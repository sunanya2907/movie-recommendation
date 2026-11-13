
const API = "/api";

let token = localStorage.getItem("token");
let currentUser = JSON.parse(
  localStorage.getItem("user") || "null"
);

let selectedMovieId = null;

// HTML safety
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

// API helper
async function apiRequest(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

// Login UI
function updateAuthUI() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userName = document.getElementById("userName");

  if (token && currentUser) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userName.textContent = `Hi, ${currentUser.name}`;
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userName.textContent = "";
  }
}

// Google login
document.getElementById("loginBtn").addEventListener("click", () => {
  window.location.href = "/auth/google";
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  token = null;
  currentUser = null;

  updateAuthUI();
});

// Load movies
async function loadMovies() {
  const grid = document.getElementById("movieGrid");

  grid.innerHTML = "<p>Loading movies...</p>";

  const genre = document.getElementById("genreFilter").value;
  const sort = document.getElementById("sortFilter").value;

  try {
    const query = new URLSearchParams({ genre, sort });

    const movies = await apiRequest(
      `${API}/movies?${query.toString()}`
    );

    if (!movies.length) {
      grid.innerHTML = "<p>No movies found. Add a recommendation!</p>";
      return;
    }

    grid.innerHTML = movies.map((movie) => `
      <div class="movie-card">

        ${
          movie.poster
            ? `<img
                 class="movie-poster"
                 src="${escapeHTML(movie.poster)}"
                 alt="${escapeHTML(movie.title)}"
                 onerror="this.style.display='none';"
               >`
            : `<div class="poster-placeholder">🎬</div>`
        }

        <div class="movie-info">

          <h3>${escapeHTML(movie.title)}</h3>

          <span class="genre-tag">
            ${escapeHTML(movie.genre)}
          </span>

          <p>
            ${escapeHTML(movie.description)}
          </p>

          <p>
            Release: ${escapeHTML(movie.releaseYear || "Unknown")}
          </p>

          <p>
            Recommended by:
            ${escapeHTML(movie.recommendedBy?.name || "User")}
          </p>

          <div class="movie-actions">

            <button
              class="vote-btn"
              onclick="voteMovie('${movie._id}', 'up')"
            >
              👍
            </button>

            <strong>${movie.voteScore || 0}</strong>

            <button
              class="vote-btn"
              onclick="voteMovie('${movie._id}', 'down')"
            >
              👎
            </button>

            <button
              class="details-btn"
              onclick="openMovie('${movie._id}')"
            >
              Discuss
            </button>

          </div>

        </div>
      </div>
    `).join("");

  } catch (error) {
    grid.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
  }
}

// Add movie
document.getElementById("movieForm").addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!token) {
      alert("Please login with Google first.");
      return;
    }

    const movie = {
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("description").value.trim(),
      genre: document.getElementById("genre").value,
      releaseYear: Number(document.getElementById("releaseYear").value) || undefined,
      poster: document.getElementById("poster").value.trim()
    };

    try {
      await apiRequest(`${API}/movies`, {
        method: "POST",
        body: JSON.stringify(movie)
      });

      document.getElementById("movieForm").reset();

      document.getElementById("formMessage").textContent =
        "Movie recommendation added successfully!";

      loadMovies();

    } catch (error) {
      alert(error.message);
    }
  }
);

// Vote
async function voteMovie(movieId, voteType) {
  if (!token) {
    alert("Please login to vote.");
    return;
  }

  try {
    await apiRequest(`${API}/movies/${movieId}/vote`, {
      method: "POST",
      body: JSON.stringify({ voteType })
    });

    loadMovies();

  } catch (error) {
    alert(error.message);
  }
}

// Open movie details
async function openMovie(movieId) {
  selectedMovieId = movieId;

  const modal = document.getElementById("detailModal");
  const details = document.getElementById("movieDetails");

  modal.classList.remove("hidden");
  details.innerHTML = "<p>Loading details...</p>";

  try {
    const movies = await apiRequest(`${API}/movies`);
    const movie = movies.find((item) => item._id === movieId);

    if (!movie) {
      details.innerHTML = "<p>Movie not found.</p>";
      return;
    }

    details.innerHTML = `
      <h2>${escapeHTML(movie.title)}</h2>
      <p class="genre-tag">${escapeHTML(movie.genre)}</p>
      <p>${escapeHTML(movie.description)}</p>
      <p>Release Year: ${escapeHTML(movie.releaseYear || "Unknown")}</p>
    `;

    loadComments(movieId);

  } catch (error) {
    details.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
  }
}

// Load comments
async function loadComments(movieId) {
  const list = document.getElementById("commentsList");

  try {
    const comments = await apiRequest(
      `${API}/movies/${movieId}/comments`
    );

    list.innerHTML = comments.map((comment) => {
      const isOwner =
        currentUser &&
        comment.user?._id === currentUser.id;

      return `
        <div class="comment">

          <strong>
            ${escapeHTML(comment.user?.name || "User")}
          </strong>

          <p>${escapeHTML(comment.text)}</p>

          ${
            isOwner
              ? `
                <div class="comment-actions">
                  <button onclick="editComment('${comment._id}')">
                    Edit
                  </button>

                  <button onclick="deleteComment('${comment._id}')">
                    Delete
                  </button>
                </div>
              `
              : ""
          }

        </div>
      `;
    }).join("");

  } catch (error) {
    list.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
  }
}

// Add comment
document.getElementById("commentForm").addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!token) {
      alert("Please login to comment.");
      return;
    }

    const text = document.getElementById("commentText").value.trim();

    if (!text) return;

    try {
      await apiRequest(
        `${API}/movies/${selectedMovieId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ text })
        }
      );

      document.getElementById("commentText").value = "";

      loadComments(selectedMovieId);

    } catch (error) {
      alert(error.message);
    }
  }
);

// Edit comment
async function editComment(commentId) {
  const newText = prompt("Enter your updated comment:");

  if (!newText || !newText.trim()) return;

  try {
    await apiRequest(`${API}/comments/${commentId}`, {
      method: "PUT",
      body: JSON.stringify({ text: newText.trim() })
    });

    loadComments(selectedMovieId);

  } catch (error) {
    alert(error.message);
  }
}

// Delete comment
async function deleteComment(commentId) {
  if (!confirm("Delete this comment?")) return;

  try {
    await apiRequest(`${API}/comments/${commentId}`, {
      method: "DELETE"
    });

    loadComments(selectedMovieId);

  } catch (error) {
    alert(error.message);
  }
}

// Filters
document.getElementById("genreFilter").addEventListener(
  "change",
  loadMovies
);

document.getElementById("sortFilter").addEventListener(
  "change",
  loadMovies
);

document.getElementById("refreshBtn").addEventListener(
  "click",
  loadMovies
);

// Close modal
document.getElementById("closeModal").addEventListener(
  "click",
  () => {
    document.getElementById("detailModal").classList.add("hidden");
  }
);

document.getElementById("detailModal").addEventListener(
  "click",
  (event) => {
    if (event.target.id === "detailModal") {
      event.target.classList.add("hidden");
    }
  }
);

// Start
updateAuthUI();
loadMovies();
