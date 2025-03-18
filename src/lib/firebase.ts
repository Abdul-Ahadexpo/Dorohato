import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDhL4CW6paTdchBzL2iTpNKInJSZI-gzQE",
  authDomain: "dorochat-cc015.firebaseapp.com",
  databaseURL: "https://dorochat-cc015-default-rtdb.firebaseio.com",
  projectId: "dorochat-cc015",
  storageBucket: "dorochat-cc015.firebasestorage.app",
  messagingSenderId: "629677703886",
  appId: "1:629677703886:web:73987e201e59593f13c69f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);