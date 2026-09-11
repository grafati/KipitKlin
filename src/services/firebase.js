import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBwqRTeD4IvEejdmUYD3ox376FykeL4M5A",
  authDomain: "isabiclean.firebaseapp.com",
  projectId: "isabiclean",
  storageBucket: "isabiclean.firebasestorage.app",
  messagingSenderId: "51660737608",
  appId: "1:51660737608:web:f519fb9d2e1243b1365c7d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});