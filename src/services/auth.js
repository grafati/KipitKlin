import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "./firebase";

// Signs the device in anonymously if it isn't already, and resolves with the uid
export const ensureSignedIn = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve(user.uid);
      } else {
        signInAnonymously(auth)
          .then((cred) => resolve(cred.user.uid))
          .catch(reject);
      }
    });
  });
};

export const getCurrentUserId = () => auth.currentUser?.uid ?? null;