import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAdiiDMuQ_TIvGlpakCgGOyjDLY3KNeLQk",
  authDomain: "absolute-bank-kj4jh.firebaseapp.com",
  projectId: "absolute-bank-kj4jh",
  storageBucket: "absolute-bank-kj4jh.firebasestorage.app",
  messagingSenderId: "385652618148",
  appId: "1:385652618148:web:3649d17bd18f039e920731"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-aispendaudit-d4488981-376b-4932-bab1-e943abc89b46");
