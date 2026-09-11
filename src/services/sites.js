import { addDoc, collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

// CREATE a site
export const createSite = async (siteData, userId) => {
  const docRef = await addDoc(collection(db, "sites"), {
    ...siteData,
    reportedBy: userId,
    status: "Reported",
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
};

// READ all sites (excludes sites cleaned more than a month ago)
export const getAllSites = async () => {
  const querySnapshot = await getDocs(collection(db, "sites"));
  const allSites = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return filterStaleCleanedSites(allSites);
};

// Hide sites that were marked "Cleaned" more than 30 days ago
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const filterStaleCleanedSites = (sites) => {
  const now = Date.now();
  return sites.filter((site) => {
    if (site.status !== "Cleaned") return true;
    if (!site.cleanedAt) return true; // no timestamp yet, keep it visible
    const cleanedTime = new Date(site.cleanedAt).getTime();
    return now - cleanedTime < ONE_MONTH_MS;
  });
};

// UPDATE a site's status
export const updateSiteStatus = async (siteId, newStatus) => {
  const siteRef = doc(db, "sites", siteId);
  const updates = { status: newStatus };

  // Stamp when it was cleaned so we know when to auto-clear it later
  if (newStatus === "Cleaned") {
    updates.cleanedAt = new Date().toISOString();
  }

  await updateDoc(siteRef, updates);
};

// Get all sites reported by a specific user
export const getSitesReportedByUser = async (userId) => {
  const allSites = await getAllSites();
  return allSites.filter((site) => site.reportedBy === userId);
};