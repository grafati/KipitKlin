import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

// Pledge an item/equipment for a site
export const createPledge = async (siteId, userId, name, item, quantity = 1) => {
  await addDoc(collection(db, "pledges"), {
    siteId,
    userId,
    name,
    item,
    quantity,
    createdAt: new Date().toISOString(),
  });
};

// Get all pledges for a specific site
export const getPledgesForSite = async (siteId) => {
  const q = query(collection(db, "pledges"), where("siteId", "==", siteId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Get all pledges made by a specific user, across all sites
export const getPledgesForUser = async (userId) => {
  const q = query(collection(db, "pledges"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Get every pledge across the whole app (for the impact counter)
export const getAllPledges = async () => {
  const querySnapshot = await getDocs(collection(db, "pledges"));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};