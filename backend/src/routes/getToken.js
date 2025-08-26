import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDh4Cxsqa2T27i0rLyd1bFlHhaL8lKz5Os",
  authDomain: "pm-assignment-5608d.firebaseapp.com",
  projectId: "pm-assignment-5608d",
  storageBucket: "pm-assignment-5608d.firebasestorage.app",
  messagingSenderId: "239878000934",
  appId: "1:239878000934:web:595c15ddf71e971dfe31e7",
  measurementId: "G-CN2NK7QV87"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function main() {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    "demo@wellness.com",
    "Demo123!"
  );
  const idToken = await userCredential.user.getIdToken();
  console.log("ID TOKEN:", idToken);
}

main();