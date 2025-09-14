import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBsc_gir4UGFK0s6d4OgqMWOZa2p6DReqE",
  authDomain: "react-to-do-list-2d0d3.firebaseapp.com",
  databaseURL: "https://react-to-do-list-2d0d3-default-rtdb.firebaseio.com",
  projectId: "react-to-do-list-2d0d3",
  storageBucket: "react-to-do-list-2d0d3.firebasestorage.app",
  messagingSenderId: "815419559709",
  appId: "1:815419559709:web:7d185a24cb2399b0d5dbf4",
  measurementId: "G-CJPJD7EZD6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export auth and Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google Sign-In Provider
const provider = new GoogleAuthProvider();
provider.addScope("profile");
provider.addScope("email");

export const signInWithGoogle = () => signInWithPopup(auth, provider);
