// ==================================================
// FIREBASE CONFIG
// Disposable Momment
// ==================================================

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ==================================================
// FIREBASE CONFIGURATION
// ==================================================

const firebaseConfig = {

  apiKey:
    "AIzaSyDwh3Ju2yVH2XzjGdd6uAhXhv137tIVTss",

  authDomain:
    "disposable-momment.firebaseapp.com",

  projectId:
    "disposable-momment",

  storageBucket:
    "disposable-momment.firebasestorage.app",

  messagingSenderId:
    "838324414716",

  appId:
    "1:838324414716:web:0bde58655b20b20f77cf79"

};


// ==================================================
// INITIALIZE FIREBASE
// ==================================================

const app =
  initializeApp(firebaseConfig);


// ==================================================
// FIREBASE AUTHENTICATION
// ==================================================

const auth =
  getAuth(app);


// ==================================================
// FIRESTORE DATABASE
// ==================================================

const db =
  getFirestore(app);


// ==================================================
// EXPORT
// ==================================================

export {
  auth,
  db,
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
};