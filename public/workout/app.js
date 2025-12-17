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

  // Only show install banner on mobile devices
  // Desktop Chrome shows install in address bar, so we only show banner on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (!isMobile) {
    console.log('Install prompt suppressed: desktop browser detected');
    return; // Don't show on desktop - use browser's native install UI
  }

  console.log('Showing install banner: mobile device detected');

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
const handleInput = document.getElementById("handle-input");
const passwordInput = document.getElementById("password-input");
const loginError = document.getElementById("login-error");
const loginTrigger = document.getElementById("login-trigger");
const cancelAuth = document.getElementById("cancel-auth");
const logoutBtn = document.getElementById("logout-btn");
const togglePasswordBtn = document.getElementById("toggle-password");
const eyeIcon = document.getElementById("eye-icon");
const eyeOffIcon = document.getElementById("eye-off-icon");

// Store focus element to return to after modal closes
let previousActiveElement = null;

// Helper to get all focusable elements in a container
function getFocusableElements(container) {
  const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(focusableSelectors))
    .filter(el => !el.disabled && !el.hasAttribute('hidden'));
}

// Focus trap handler
function handleFocusTrap(e, container) {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (e.key === 'Tab') {
    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }
}

// Helper to close auth modal
function closeAuthModal() {
  authModal.classList.add("hidden");
  if (handleInput) handleInput.value = "";
  if (passwordInput) passwordInput.value = "";
  if (loginError) {
    loginError.classList.add("hidden");
    loginError.textContent = "";
  }

  // Return focus to trigger element
  if (previousActiveElement) {
    previousActiveElement.focus();
    previousActiveElement = null;
  }
}

// Helper to show login error
function showLoginError(message) {
  if (loginError) {
    loginError.textContent = message;
    loginError.classList.remove("hidden");
  } else {
    alert(message);
  }
}

// Password visibility toggle
if (togglePasswordBtn && passwordInput && eyeIcon && eyeOffIcon) {
  togglePasswordBtn.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    eyeIcon.classList.toggle("hidden", isPassword);
    eyeOffIcon.classList.toggle("hidden", !isPassword);
  });
}

// Show auth modal
if (loginTrigger) {
  loginTrigger.addEventListener("click", () => {
    previousActiveElement = document.activeElement;
    authModal.classList.remove("hidden");

    // Focus first input field
    if (handleInput) {
      handleInput.focus();
    } else if (passwordInput) {
      passwordInput.focus();
    }
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

  // Handle keyboard navigation (ESC to close, Tab to trap focus)
  document.addEventListener("keydown", (e) => {
    if (!authModal.classList.contains("hidden")) {
      if (e.key === "Escape") {
        closeAuthModal();
      } else {
        handleFocusTrap(e, authModal);
      }
    }
  });
}

// Login form submission
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const handle = handleInput ? handleInput.value.toLowerCase().trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    // Client-side validation
    if (!handle || handle.length < 3) {
      showLoginError("Handle must be at least 3 characters");
      if (handleInput) handleInput.focus();
      return;
    }

    if (handle.length > 20) {
      showLoginError("Handle must be 20 characters or less");
      if (handleInput) handleInput.focus();
      return;
    }

    // Pattern: lowercase letters, numbers, hyphens (but not at start/end)
    const handlePattern = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;
    if (!handlePattern.test(handle)) {
      showLoginError("Handle must be 3-20 characters (lowercase, numbers, hyphens - not at start/end)");
      if (handleInput) handleInput.focus();
      return;
    }

    if (!password) {
      showLoginError("Password is required");
      if (passwordInput) passwordInput.focus();
      return;
    }

    // Show loading state
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Joining...";

    try {
      const res = await fetch("/workout/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Login successful - reload page to show authenticated state
        window.location.reload();
      } else {
        showLoginError(data.error || "Login failed");
        if (passwordInput) {
          passwordInput.value = "";
          passwordInput.focus();
        }
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    } catch (error) {
      console.error("Login error:", error);
      showLoginError("Network error. Please try again.");
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
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

  // Return focus to trigger element
  if (previousActiveElement) {
    previousActiveElement.focus();
    previousActiveElement = null;
  }
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

  // Handle keyboard navigation (ESC to close, Tab to trap focus)
  document.addEventListener("keydown", (e) => {
    if (!notesModal.classList.contains("hidden")) {
      if (e.key === "Escape") {
        closeNotesModal();
      } else {
        handleFocusTrap(e, notesModal);
      }
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
      previousActiveElement = document.activeElement;
      pendingWorkout = { week, day };
      notesInput.value = "";
      notesModal.classList.remove("hidden");

      // Focus textarea
      if (notesInput) {
        notesInput.focus();
      }
    }
  });
});

// Activity Feed Real-Time Updates
// Poll for new activity every 30 seconds
const activityFeedContainer = document.getElementById('activity-items');
let currentHandle = null;

// Get current user handle from auth check
async function getCurrentHandle() {
  try {
    const res = await fetch('/workout/api/check-auth');
    if (res.ok) {
      const data = await res.json();
      return data.handle;
    }
  } catch (error) {
    console.error('Failed to get current handle:', error);
  }
  return null;
}

// Format relative time
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Update activity feed with new data
function updateActivityFeed(activities) {
  if (!activityFeedContainer) return;

  if (!activities || activities.length === 0) {
    activityFeedContainer.innerHTML = '<p class="text-zinc-600">No recent activity yet. Be the first to complete a workout!</p>';
    return;
  }

  const activityItems = activities.slice(0, 10).map((activity) => {
    const isCurrentUser = currentHandle && activity.handle === currentHandle;
    const handleDisplay = isCurrentUser ? "You" : `@${escapeHtml(activity.handle)}`;
    const handleClass = isCurrentUser ? "font-bold text-green-600" : "font-medium";

    return `
      <div class="flex items-center gap-2 py-2 border-b border-zinc-200 last:border-0">
        <span class="${handleClass}">${handleDisplay}</span>
        <span class="text-zinc-600">completed</span>
        <span class="font-medium">Week ${activity.week}, Day ${activity.day}</span>
        <span class="text-xs text-zinc-600 ml-auto">${timeAgo(activity.completedAt)}</span>
      </div>
    `;
  }).join("");

  activityFeedContainer.innerHTML = activityItems;
}

// Basic HTML escaping for XSS protection
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Poll for activity updates
async function pollActivityFeed() {
  try {
    const res = await fetch('/workout/api/activity?limit=10');
    if (res.ok) {
      const data = await res.json();
      // Handle both old format (array) and new format (object with activities)
      const activities = Array.isArray(data) ? data : data.activities;
      updateActivityFeed(activities);
    }
  } catch (error) {
    console.error('Activity feed poll error:', error);
  }
}

// Initialize activity feed polling if the container exists
if (activityFeedContainer) {
  // Get current handle once
  getCurrentHandle().then(handle => {
    currentHandle = handle;
    // Start polling every 30 seconds
    setInterval(pollActivityFeed, 30000);
  });
}
