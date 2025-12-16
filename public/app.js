/**
 * Client-side JavaScript for workout-trainer
 * Vanilla JavaScript (no React) - replaces all React event handlers
 */

// Auth modal elements
const authModal = document.getElementById("auth-modal");
const loginForm = document.getElementById("login-form");
const passwordInput = document.getElementById("password-input");
const loginTrigger = document.getElementById("login-trigger");
const cancelAuth = document.getElementById("cancel-auth");
const logoutBtn = document.getElementById("logout-btn");

// Show auth modal
if (loginTrigger) {
  loginTrigger.addEventListener("click", () => {
    authModal.classList.remove("hidden");
    passwordInput.focus();
  });
}

// Hide auth modal
if (cancelAuth) {
  cancelAuth.addEventListener("click", () => {
    authModal.classList.add("hidden");
    passwordInput.value = "";
  });
}

// Login form submission
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = passwordInput.value;

    try {
      const res = await fetch("/workout/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Login successful - reload page to show authenticated state
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || "Invalid password");
        passwordInput.value = "";
        passwordInput.focus();
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    }
  });
}

// Logout button
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/workout/api/logout", { method: "POST" });
      window.location.reload();
    } catch (error) {
      console.error("Logout error:", error);
      alert("Logout failed. Please try again.");
    }
  });
}

// Week navigation
const prevWeek = document.getElementById("prev-week");
const nextWeek = document.getElementById("next-week");
const currentWeekElem = document.querySelector("[data-current-week]");
const currentWeek = currentWeekElem
  ? parseInt(currentWeekElem.dataset.currentWeek, 10)
  : 1;

if (prevWeek && !prevWeek.disabled) {
  prevWeek.addEventListener("click", () => {
    window.location.href = `/workout/?week=${currentWeek - 1}`;
  });
}

if (nextWeek && !nextWeek.disabled) {
  nextWeek.addEventListener("click", () => {
    window.location.href = `/workout/?week=${currentWeek + 1}`;
  });
}

// Workout card expansion
document.querySelectorAll(".expand-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const card = e.target.closest(".workout-card");
    const exerciseList = card.querySelector(".exercise-list");
    const isHidden = exerciseList.classList.contains("hidden");

    exerciseList.classList.toggle("hidden");
    btn.textContent = isHidden ? "Hide exercises ↑" : "Show exercises ↓";
  });
});

// Complete/Undo buttons
document.querySelectorAll(".complete-btn").forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    const week = parseInt(e.target.dataset.week, 10);
    const day = parseInt(e.target.dataset.day, 10);
    const isComplete = e.target.textContent.trim() === "Undo";

    try {
      const endpoint = isComplete ? "/workout/api/unmark" : "/workout/api/mark-complete";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, day }),
      });

      if (res.ok) {
        // Success - reload page to show updated state
        window.location.reload();
      } else if (res.status === 401) {
        // Unauthorized - show login modal
        authModal.classList.remove("hidden");
        passwordInput.focus();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update workout");
      }
    } catch (error) {
      console.error("Update workout error:", error);
      alert("Network error. Please try again.");
    }
  });
});
