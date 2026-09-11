import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

// Sign up a user as a volunteer for a site
export const signUpVolunteer = async (siteId, userId, name, note = "", cleanupDate = "") => {
  await addDoc(collection(db, "volunteerSignups"), {
    siteId,
    userId,
    name,
    note,
    cleanupDate,
    createdAt: new Date().toISOString(),
  });
};

// Get all volunteers for a specific site
export const getVolunteersForSite = async (siteId) => {
  const q = query(collection(db, "volunteerSignups"), where("siteId", "==", siteId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Get all volunteer signups made by a specific user, across all sites
export const getVolunteerSignupsForUser = async (userId) => {
  const q = query(collection(db, "volunteerSignups"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Get every volunteer signup across the whole app (for the impact counter)
export const getAllVolunteers = async () => {
  const querySnapshot = await getDocs(collection(db, "volunteerSignups"));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};