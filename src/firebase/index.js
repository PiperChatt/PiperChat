import { initializeApp } from 'firebase/app';
import { getAuth  } from "firebase/auth";

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCVY7_r9fLSWu2WQEwk773R5KN-fXCDSQI",
  authDomain: "piperchat-dff53.firebaseapp.com",
  projectId: "piperchat-dff53",
  storageBucket: "piperchat-dff53.appspot.com",
  messagingSenderId: "663662170084",
  appId: "1:663662170084:web:d7b19b014157f6a255c1f1",
  measurementId: "G-BPE4C7VHV7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

