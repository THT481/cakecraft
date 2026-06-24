// ============================================
// FIREBASE CONFIGURATION
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  browserLocalPersistence,
  setPersistence
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD1jpP0HN-XCakHmZC7j-snm9MFBbwdMyw",
  authDomain: "coffemanagement-6ae8a.firebaseapp.com",
  projectId: "coffemanagement-6ae8a",
  storageBucket: "coffemanagement-6ae8a.firebasestorage.app",
  messagingSenderId: "731639061388",
  appId: "1:731639061388:web:a94aebb0ada27a334094a9",
  measurementId: "G-75V434NJFF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// QUAN TRỌNG: Tạo Promise để các module khác có thể await đợi persistence
// được set xong TRƯỚC KHI onAuthStateChanged được gọi
const authReady = setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✓ Firebase persistence: LOCAL (lưu phiên đăng nhập)');
  })
  .catch(err => {
    console.warn('Persistence error:', err);
  });

// Custom parameters for Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Export everything needed
export {
  app,
  auth,
  db,
  googleProvider,
  authReady,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  onSnapshot
};