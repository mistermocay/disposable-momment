// ============================================================================
// create-event/script.js
// Disposable Momment — Create Event flow.
//
// Flow: form -> validate -> sendSignInLinkToEmail -> "check your email" ->
// user clicks magic link -> signInWithEmailLink -> create event in
// Firestore -> success screen.
//
// No passwords, no traditional accounts. Host identity = Firebase Auth uid.
// ============================================================================

import { auth, db } from "../firebase.js";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ----------------------------------------------------------------------------
// Storage keys (namespaced so they don't collide with anything else on the
// same origin).
// ----------------------------------------------------------------------------
const LS_EMAIL_KEY = "dm_emailForSignIn";
const LS_PENDING_EVENT_KEY = "dm_pendingEventData";

// Where the magic link should send the host back to. Must be an authorized
// domain in the Firebase console (see README for setup steps).
const REDIRECT_URL = `${window.location.origin}/create-event/`;

// ----------------------------------------------------------------------------
// DOM references
// ----------------------------------------------------------------------------
const views = {
  form: document.getElementById("view-form"),
  checkEmail: document.getElementById("view-check-email"),
  confirmEmail: document.getElementById("view-confirm-email"),
  verifying: document.getElementById("view-verifying"),
  success: document.getElementById("view-success"),
};

const globalError = document.getElementById("globalError");
const globalErrorText = document.getElementById("globalErrorText");

const eventForm = document.getElementById("eventForm");
const submitBtn = document.getElementById("submitBtn");

const revealRadios = document.querySelectorAll('input[name="revealMode"]');
const customRevealFields = document.getElementById("customRevealFields");

const sentToEmailEl = document.getElementById("sentToEmail");
const resendBtn = document.getElementById("resendBtn");
const resendNote = document.getElementById("resendNote");
const useAnotherEmailBtn = document.getElementById("useAnotherEmailBtn");

const confirmEmailForm = document.getElementById("confirmEmailForm");
const verifyingText = document.getElementById("verifyingText");

const successEventName = document.getElementById("successEventName");
const successGuestLink = document.getElementById("successGuestLink");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const openGuestPageBtn = document.getElementById("openGuestPageBtn");
const goToManagementBtn = document.getElementById("goToManagementBtn");

// ----------------------------------------------------------------------------
// View switching
// ----------------------------------------------------------------------------
function showView(name) {
  Object.entries(views).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle("is-active", key === name);
  });
}

function showGlobalError(message) {
  globalErrorText.textContent = message;
  globalError.hidden = false;
  globalError.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideGlobalError() {
  globalError.hidden = true;
  globalErrorText.textContent = "";
}

// ----------------------------------------------------------------------------
// Friendly error messages — never show raw Firebase error text to the user.
// ----------------------------------------------------------------------------
function friendlyErrorMessage(error) {
  const code = error && error.code ? error.code : "";

  const messages = {
    "auth/invalid-email": "That email address doesn't look right. Please check it and try again.",
    "auth/missing-email": "Please enter an email address.",
    "auth/quota-exceeded": "Too many attempts right now. Please try again in a few minutes.",
    "auth/network-request-failed": "We couldn't reach the server. Check your connection and try again.",
    "auth/invalid-action-code": "This link has expired or was already used. Please request a new one.",
    "auth/expired-action-code": "This link has expired. Please request a new one.",
    "auth/invalid-api-key": "Disposable Momment isn't fully configured yet. Please contact the site owner.",
    "auth/api-key-not-valid": "Disposable Momment isn't fully configured yet. Please contact the site owner.",
    "unavailable": "We're having trouble reaching Disposable Momment right now. Please try again shortly.",
  };

  if (messages[code]) return messages[code];

  if (!navigator.onLine) {
    return "You appear to be offline. Please check your connection and try again.";
  }

  return "Something went wrong. Please try again.";
}

// ----------------------------------------------------------------------------
// Field-level validation helpers
// ----------------------------------------------------------------------------
function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`err-${fieldId}`);
  const group = input ? input.closest(".field-group") : errorEl?.closest(".field-group");
  if (group) group.classList.add("has-error");
  if (errorEl) errorEl.textContent = message;
}

function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`err-${fieldId}`);
  const group = input ? input.closest(".field-group") : errorEl?.closest(".field-group");
  if (group) group.classList.remove("has-error");
  if (errorEl) errorEl.textContent = "";
}

function clearAllFieldErrors(ids) {
  ids.forEach(clearFieldError);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEventForm(data) {
  const errors = {};

  if (!data.eventName) errors.eventName = "Please enter an event name.";
  if (!data.hostName) errors.hostName = "Please enter your name.";

  if (!data.hostEmail) {
    errors.hostEmail = "Please enter your email.";
  } else if (!EMAIL_RE.test(data.hostEmail)) {
    errors.hostEmail = "Please enter a valid email address.";
  }

  if (!data.eventDate) errors.eventDate = "Please choose the event date.";
  if (!data.startTime) errors.startTime = "Please choose a start time.";
  if (!data.endTime) errors.endTime = "Please choose an end time.";

  if (data.startTime && data.endTime && data.endTime <= data.startTime) {
    errors.endTime = "End time can't be before the start time.";
  }

  if (!data.photoLimit || Number(data.photoLimit) < 1) {
    errors.photoLimit = "Photo limit must be at least 1.";
  }

  if (data.revealMode === "custom") {
    if (!data.revealDate) errors.revealDate = "Please choose a reveal date.";
    if (!data.revealTime) errors.revealTime = "Please choose a reveal time.";
  }

  return errors;
}

function collectFormData() {
  const formData = new FormData(eventForm);
  return {
    eventName: (formData.get("eventName") || "").toString().trim(),
    hostName: (formData.get("hostName") || "").toString().trim(),
    hostEmail: (formData.get("hostEmail") || "").toString().trim().toLowerCase(),
    eventDate: (formData.get("eventDate") || "").toString(),
    startTime: (formData.get("startTime") || "").toString(),
    endTime: (formData.get("endTime") || "").toString(),
    photoLimit: Number(formData.get("photoLimit") || 0),
    revealMode: (formData.get("revealMode") || "after-event").toString(),
    revealDate: (formData.get("revealDate") || "").toString(),
    revealTime: (formData.get("revealTime") || "").toString(),
  };
}

// ----------------------------------------------------------------------------
// Custom reveal fields toggle
// ----------------------------------------------------------------------------
function updateCustomRevealVisibility() {
  const selected = document.querySelector('input[name="revealMode"]:checked');
  const isCustom = selected && selected.value === "custom";
  customRevealFields.hidden = !isCustom;
  if (!isCustom) {
    clearFieldError("revealDate");
    clearFieldError("revealTime");
  }
}

revealRadios.forEach((radio) => {
  radio.addEventListener("change", updateCustomRevealVisibility);
});

// ----------------------------------------------------------------------------
// Submit button loading state
// ----------------------------------------------------------------------------
function setSubmitLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.querySelector(".btn__label").textContent = isLoading ? "Sending link…" : "Create Event";
  submitBtn.querySelector(".btn__spinner").hidden = !isLoading;
}

// ----------------------------------------------------------------------------
// Step 1 — form submit: validate, then send the magic link
// ----------------------------------------------------------------------------
const ALL_FIELD_IDS = [
  "eventName", "hostName", "hostEmail", "eventDate",
  "startTime", "endTime", "photoLimit", "revealDate", "revealTime",
];

eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideGlobalError();
  clearAllFieldErrors(ALL_FIELD_IDS);

  const data = collectFormData();
  const errors = validateEventForm(data);

  if (Object.keys(errors).length > 0) {
    Object.entries(errors).forEach(([field, message]) => setFieldError(field, message));
    const firstInvalidId = Object.keys(errors)[0];
    const firstInvalidEl = document.getElementById(firstInvalidId);
    if (firstInvalidEl) firstInvalidEl.focus();
    return;
  }

  setSubmitLoading(true);

  try {
    // Persist form data + email locally so we can resume after the host
    // clicks the magic link (same browser/device).
    window.localStorage.setItem(LS_PENDING_EVENT_KEY, JSON.stringify(data));
    window.localStorage.setItem(LS_EMAIL_KEY, data.hostEmail);

    await sendSignInLinkToEmail(auth, data.hostEmail, {
      url: REDIRECT_URL,
      handleCodeInApp: true,
    });

    sentToEmailEl.textContent = data.hostEmail;
    showView("checkEmail");
  } catch (error) {
    console.error("sendSignInLinkToEmail failed:", error);
    showGlobalError(friendlyErrorMessage(error));
  } finally {
    setSubmitLoading(false);
  }
});

// ----------------------------------------------------------------------------
// Resend link
// ----------------------------------------------------------------------------
let resendCooldownTimer = null;

function startResendCooldown(seconds) {
  let remaining = seconds;
  resendBtn.disabled = true;
  resendNote.textContent = `You can resend in ${remaining}s.`;

  clearInterval(resendCooldownTimer);
  resendCooldownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(resendCooldownTimer);
      resendBtn.disabled = false;
      resendNote.textContent = "";
    } else {
      resendNote.textContent = `You can resend in ${remaining}s.`;
    }
  }, 1000);
}

resendBtn.addEventListener("click", async () => {
  const email = window.localStorage.getItem(LS_EMAIL_KEY);
  if (!email) {
    showView("form");
    return;
  }

  hideGlobalError();
  resendBtn.disabled = true;

  try {
    await sendSignInLinkToEmail(auth, email, {
      url: REDIRECT_URL,
      handleCodeInApp: true,
    });
    resendNote.textContent = "Link sent again — check your inbox.";
    startResendCooldown(30);
  } catch (error) {
    console.error("Resend failed:", error);
    showGlobalError(friendlyErrorMessage(error));
    resendBtn.disabled = false;
  }
});

useAnotherEmailBtn.addEventListener("click", () => {
  window.localStorage.removeItem(LS_EMAIL_KEY);
  hideGlobalError();
  showView("form");
});

// ----------------------------------------------------------------------------
// Step 2 — confirm email (cross-device magic link open)
// ----------------------------------------------------------------------------
confirmEmailForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearFieldError("confirmEmail");

  const email = document.getElementById("confirmEmail").value.trim().toLowerCase();

  if (!email) {
    setFieldError("confirmEmail", "Please enter your email.");
    return;
  }
  if (!EMAIL_RE.test(email)) {
    setFieldError("confirmEmail", "Please enter a valid email address.");
    return;
  }

  window.localStorage.setItem(LS_EMAIL_KEY, email);
  completeSignIn(email);
});

// ----------------------------------------------------------------------------
// Step 3 — complete sign-in with the magic link, then create the event
// ----------------------------------------------------------------------------
async function completeSignIn(email) {
  showView("verifying");
  verifyingText.textContent = "Verifying your link…";
  hideGlobalError();

  try {
    const result = await signInWithEmailLink(auth, email, window.location.href);

    // Clean the sign-in params out of the URL so a refresh doesn't retrigger this.
    window.history.replaceState({}, document.title, REDIRECT_URL);
    window.localStorage.removeItem(LS_EMAIL_KEY);

    await createEventForUser(result.user);
  } catch (error) {
    console.error("signInWithEmailLink failed:", error);
    showView("form");
    showGlobalError(friendlyErrorMessage(error));
  }
}

// ----------------------------------------------------------------------------
// Step 4 — create the event document in Firestore
// ----------------------------------------------------------------------------
function generateEventId() {
  // Short, URL-friendly random id (not sequential/guessable).
  const bytes = new Uint8Array(6);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 9);
}

async function createEventForUser(user) {
  verifyingText.textContent = "Setting up your event…";

  const pendingRaw = window.localStorage.getItem(LS_PENDING_EVENT_KEY);

  if (!pendingRaw) {
    // The event details live in this browser's localStorage only. If the
    // host opened the magic link on a different device/browser, we won't
    // have them here.
    showView("form");
    showGlobalError(
      "We couldn't find your event details on this device. Please open the magic link on the same device and browser where you created the event, or fill out the form again."
    );
    return;
  }

  let pending;
  try {
    pending = JSON.parse(pendingRaw);
  } catch (e) {
    showView("form");
    showGlobalError("We couldn't find your event details. Please fill out the form again.");
    return;
  }

  const eventId = generateEventId();

  try {
    await setDoc(doc(db, "events", eventId), {
      eventName: pending.eventName,
      hostName: pending.hostName,
      hostEmail: pending.hostEmail,
      hostUid: user.uid,
      eventDate: pending.eventDate,
      startTime: pending.startTime,
      endTime: pending.endTime,
      photoLimit: pending.photoLimit,
      revealMode: pending.revealMode,
      revealDate: pending.revealMode === "custom" ? pending.revealDate : null,
      revealTime: pending.revealMode === "custom" ? pending.revealTime : null,
      status: "active",
      createdAt: serverTimestamp(),
    });

    window.localStorage.removeItem(LS_PENDING_EVENT_KEY);
    showEventCreated(eventId, pending);
  } catch (error) {
    console.error("Firestore write failed:", error);
    showView("form");
    showGlobalError("We couldn't save your event. Please try again.");
  }
}

// ----------------------------------------------------------------------------
// Step 5 — success screen
// ----------------------------------------------------------------------------
function showEventCreated(eventId, pending) {
  const guestUrl = `${window.location.origin}/event/${eventId}`;
  const manageUrl = `${window.location.origin}/manage/${eventId}`;

  successEventName.textContent = pending.eventName;
  successGuestLink.textContent = guestUrl;
  openGuestPageBtn.href = `/event/${eventId}`;
  goToManagementBtn.href = `/manage/${eventId}`;

  showView("success");
}

copyLinkBtn.addEventListener("click", async () => {
  const text = successGuestLink.textContent;
  const originalLabel = copyLinkBtn.textContent;

  try {
    await navigator.clipboard.writeText(text);
    copyLinkBtn.textContent = "Copied!";
  } catch (e) {
    // Clipboard API unavailable — fall back to selecting the text.
    const range = document.createRange();
    range.selectNode(successGuestLink);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    copyLinkBtn.textContent = "Selected";
  }

  setTimeout(() => { copyLinkBtn.textContent = originalLabel; }, 2000);
});

// ----------------------------------------------------------------------------
// Boot: figure out which view to show on page load
// ----------------------------------------------------------------------------
(function init() {
  updateCustomRevealVisibility();

  if (isSignInWithEmailLink(auth, window.location.href)) {
    const storedEmail = window.localStorage.getItem(LS_EMAIL_KEY);

    if (storedEmail) {
      completeSignIn(storedEmail);
    } else {
      // Opened on a different device/browser — ask the host to confirm their email.
      showView("confirmEmail");
    }
    return;
  }

  // Not a magic-link visit. If there's a pending request from earlier in
  // this browser, resume the "check your email" state instead of losing it.
  const storedEmail = window.localStorage.getItem(LS_EMAIL_KEY);
  const pendingEvent = window.localStorage.getItem(LS_PENDING_EVENT_KEY);

  if (storedEmail && pendingEvent) {
    sentToEmailEl.textContent = storedEmail;
    showView("checkEmail");
  } else {
    showView("form");
  }
})();