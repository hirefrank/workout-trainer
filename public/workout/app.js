/**
 * Client-side JavaScript for workout-trainer
 * Vanilla JavaScript (no React) - replaces all React event handlers
 */

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/workout/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show install banner
  const installBanner = document.createElement('div');
  installBanner.id = 'install-banner';
  installBanner.className = 'fixed bottom-4 left-4 right-4 bg-black text-white p-4 border-2 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] z-50';
  installBanner.innerHTML = `
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="font-bold text-sm">Install Workout Trainer</p>
        <p class="text-xs opacity-80">Add to home screen for quick access</p>
      </div>
      <div class="flex gap-2">
        <button id="install-btn" class="px-3 py-1 text-xs font-bold bg-green-400 text-black border border-white">
          Install
        </button>
        <button id="dismiss-install" class="px-3 py-1 text-xs font-bold bg-white text-black border border-white">
          ✕
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(installBanner);

  document.getElementById('install-btn').addEventListener('click', async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User ${outcome} the install prompt`);
    installBanner.remove();
    deferredPrompt = null;
  });

  document.getElementById('dismiss-install').addEventListener('click', () => {
    installBanner.remove();
  });
});

// Push Notifications
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

async function subscribeToPushNotifications() {
  const registration = await navigator.serviceWorker.ready;

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        'YOUR_VAPID_PUBLIC_KEY_HERE' // You'll need to generate VAPID keys
      )
    });

    // Send subscription to server
    await fetch('/workout/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });

    return true;
  } catch (error) {
    console.error('Failed to subscribe:', error);
    return false;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Add notification button to header (optional - you can customize this)
window.addEventListener('DOMContentLoaded', () => {
  if ('Notification' in window && Notification.permission === 'default') {
    // Show notification opt-in after login
  }
});

// Auth modal elements
const authModal = document.getElementById("auth-modal");
const loginForm = document.getElementById("login-form");
const passwordInput = document.getElementById("password-input");
const loginTrigger = document.getElementById("login-trigger");
const cancelAuth = document.getElementById("cancel-auth");
const logoutBtn = document.getElementById("logout-btn");

// Helper to close auth modal
function closeAuthModal() {
  authModal.classList.add("hidden");
  passwordInput.value = "";
}

// Show auth modal
if (loginTrigger) {
  loginTrigger.addEventListener("click", () => {
    authModal.classList.remove("hidden");
    passwordInput.focus();
  });
}

// Hide auth modal
if (cancelAuth) {
  cancelAuth.addEventListener("click", closeAuthModal);
}

// Close auth modal on ESC key or click outside
if (authModal) {
  authModal.addEventListener("click", (e) => {
    if (e.target === authModal) {
      closeAuthModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !authModal.classList.contains("hidden")) {
      closeAuthModal();
    }
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

// Workout card expansion - click anywhere on card to expand/collapse
document.querySelectorAll(".workout-card").forEach((card) => {
  card.addEventListener("click", (e) => {
    const exerciseList = card.querySelector(".exercise-list");
    const expandText = card.querySelector(".expand-text");
    const isHidden = exerciseList.classList.contains("hidden");

    exerciseList.classList.toggle("hidden");
    if (expandText) {
      expandText.textContent = isHidden ? "Hide exercises ↑" : "Show exercises ↓";
    }
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

// Helper to close notes modal
function closeNotesModal() {
  notesModal.classList.add("hidden");
  notesInput.value = "";
  pendingWorkout = null;
}

// Cancel notes button (close modal)
if (cancelNotes) {
  cancelNotes.addEventListener("click", closeNotesModal);
}

// Close notes modal on ESC key or click outside
if (notesModal) {
  notesModal.addEventListener("click", (e) => {
    if (e.target === notesModal) {
      closeNotesModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !notesModal.classList.contains("hidden")) {
      closeNotesModal();
    }
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
