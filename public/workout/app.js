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

// Notes modal elements
const notesModal = document.getElementById("notes-modal");
const notesForm = document.getElementById("notes-form");
const notesInput = document.getElementById("notes-input");
const skipNotes = document.getElementById("skip-notes");
const cancelNotes = document.getElementById("cancel-notes");

// Store pending workout completion
let pendingWorkout = null;

// Helper function to mark workout complete
async function markWorkoutComplete(week, day, notes) {
  try {
    const body = notes ? { week, day, notes } : { week, day };
    const res = await fetch("/workout/api/mark-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      // Success - reload page to show updated state
      window.location.reload();
    } else if (res.status === 401) {
      // Unauthorized - show login modal
      notesModal.classList.add("hidden");
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
}

// Notes form submission (with notes)
if (notesForm) {
  notesForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (pendingWorkout) {
      const notes = notesInput.value.trim();
      await markWorkoutComplete(pendingWorkout.week, pendingWorkout.day, notes || undefined);
    }
  });
}

// Skip notes button (complete without notes)
if (skipNotes) {
  skipNotes.addEventListener("click", async () => {
    if (pendingWorkout) {
      await markWorkoutComplete(pendingWorkout.week, pendingWorkout.day, undefined);
    }
  });
}

// Cancel notes button (close modal)
if (cancelNotes) {
  cancelNotes.addEventListener("click", () => {
    notesModal.classList.add("hidden");
    notesInput.value = "";
    pendingWorkout = null;
  });
}

// Complete/Undo buttons
document.querySelectorAll(".complete-btn").forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    const week = parseInt(e.target.dataset.week, 10);
    const day = parseInt(e.target.dataset.day, 10);
    const isComplete = e.target.textContent.trim() === "Undo";

    if (isComplete) {
      // Undo - directly call API
      try {
        const res = await fetch("/workout/api/unmark", {
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
    } else {
      // Complete - show notes modal
      pendingWorkout = { week, day };
      notesInput.value = "";
      notesModal.classList.remove("hidden");
      notesInput.focus();
    }
  });
});
