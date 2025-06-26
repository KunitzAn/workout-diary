import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBHGVv5nbyAS_SFoMo9z4pSgVfnAiqw6mI",
  authDomain: "workoutdiary-610d0.firebaseapp.com",
  projectId: "workoutdiary-610d0",
  storageBucket: "workoutdiary-610d0.firebasestorage.app",
  messagingSenderId: "760171999000",
  appId: "1:760171999000:web:57e3a25ee97e74da98f86d",
  measurementId: "G-L0D1YX2JC0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };