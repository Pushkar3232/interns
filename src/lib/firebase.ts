
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAD83x3UkQx82EmhvohqX-0nGA9OnFSNGc",
  authDomain: "v2vinterns.firebaseapp.com",
  projectId: "v2vinterns",
  storageBucket: "v2vinterns.firebasestorage.app",
  messagingSenderId: "673524182487",
  appId: "1:673524182487:web:293f89adda5cf54f232f92",
  measurementId: "G-XBSGVVERF5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
