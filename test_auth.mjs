import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import axios from "axios";

const firebaseConfig = {
  apiKey: "AIzaSyDCPWmq7fYUrtC7SdBLJ4WlEy-EEmNHEuw",
  authDomain: "urbaneye-a40b0.firebaseapp.com",
  projectId: "urbaneye-a40b0",
  storageBucket: "urbaneye-a40b0.firebasestorage.app",
  messagingSenderId: "295906520445",
  appId: "1:295906520445:web:46c34f1b1ee7bf9f1db014"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function test() {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, "yashontabs@gmail.com", "yashontabs");
    const token = await userCredential.user.getIdToken(true);
    console.log("Got token length:", token.length);
    
    try {
      const res = await axios.post('http://localhost:8080/api/users/register', { name: "Test" }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Success:", res.data);
    } catch (e) {
      console.log("Error status:", e.response?.status);
      console.log("Error data:", e.response?.data);
    }
    
    process.exit(0);
  } catch (err) {
    console.error("Firebase Auth Error:", err.message);
    process.exit(1);
  }
}
test();
