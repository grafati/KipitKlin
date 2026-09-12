import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { addDoc, collection, doc, getDocs, getFirestore, query, updateDoc, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { cloudinary, firebaseConfig } from "./config.js";
import { upcomingCleanupDates } from "./dates.js";
import { byId, escapeHtml } from "./dom.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let currentUser = null;
let currentLocation = null;
let sites = [];

const distanceKm = (from, to) => {
  const earthRadiusKm = 6371;
  const latitudeDelta = (to.latitude - from.latitude) * Math.PI / 180;
  const longitudeDelta = (to.longitude - from.longitude) * Math.PI / 180;
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const distanceLabel = (site) => {
  if (!currentLocation || !Number.isFinite(site.latitude) || !Number.isFinite(site.longitude)) return "Location not provided";
  const kilometers = distanceKm(currentLocation, site);
  return kilometers < 1 ? `${Math.round(kilometers * 1000)} m away` : `${kilometers.toFixed(1)} km away`;
};

const activeSites = (items) => items.filter((site) => site.status !== "Cleaned" || !site.cleanedAt || Date.now() - new Date(site.cleanedAt).getTime() < 30 * 86400000);

async function ensureUser() {
  return new Promise((resolve, reject) => onAuthStateChanged(auth, async (user) => {
    try {
      currentUser = user || (await signInAnonymously(auth)).user;
      resolve(currentUser);
    } catch (error) {
      reject(error);
    }
  }));
}

async function loadSites() {
  const snapshot = await getDocs(collection(db, "sites"));
  sites = activeSites(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  renderSites();

  const [volunteers, pledges] = await Promise.all([
    getDocs(collection(db, "volunteers")),
    getDocs(collection(db, "pledges")),
  ]);
  byId("site-count").textContent = sites.length;
  byId("volunteer-count").textContent = volunteers.size;
  byId("pledge-count").textContent = pledges.size;
  await renderActivity();
}

function renderSites() {
  const list = byId("report-list");
  const sortedSites = [...sites].sort((first, second) => currentLocation ? distanceKm(currentLocation, first) - distanceKm(currentLocation, second) : 0);
  if (!sortedSites.length) {
    list.innerHTML = '<p class="muted">No reports yet. Be the first person to report a site.</p>';
    return;
  }

  list.innerHTML = sortedSites.map((site) => `<article class="report-card">
    ${site.photoUrl ? `<img src="${escapeHtml(site.photoUrl)}" alt="Reported waste site" />` : ""}
    <div class="card-content">
      <span class="badge ${site.status === "Cleaned" ? "cleaned" : ""}">${escapeHtml(site.status || "Reported")}</span>
      <h3>${escapeHtml(site.title || "Waste report")}</h3>
      <p>${escapeHtml(site.description || "No description supplied.")}</p>
      <p>${distanceLabel(site)}</p>
      <button class="card-link" data-site-id="${site.id}">View and contribute →</button>
    </div>
  </article>`).join("");
  list.querySelectorAll("[data-site-id]").forEach((button) => button.addEventListener("click", () => showSite(button.dataset.siteId)));
}

async function renderActivity() {
  if (!currentUser) return;
  const [reports, volunteers, pledges] = await Promise.all([
    getDocs(query(collection(db, "sites"), where("reportedBy", "==", currentUser.uid))),
    getDocs(query(collection(db, "volunteers"), where("userId", "==", currentUser.uid))),
    getDocs(query(collection(db, "pledges"), where("userId", "==", currentUser.uid))),
  ]);
  const card = (title, entries, formatter) => `<article class="activity-card"><h3>${title} (${entries.length})</h3>${entries.length ? `<ul>${entries.map(formatter).join("")}</ul>` : '<p class="muted">Nothing here yet.</p>'}</article>`;
  byId("activity-list").innerHTML = card("Reports I made", reports.docs.map((item) => item.data()), (item) => `<li>${escapeHtml(item.title || "Waste report")}</li>`)
    + card("Volunteer sign-ups", volunteers.docs.map((item) => item.data()), (item) => `<li>${escapeHtml(siteTitle(item.siteId))}${item.cleanupDate ? ` — ${escapeHtml(item.cleanupDate)}` : ""}</li>`)
    + card("Equipment pledges", pledges.docs.map((item) => item.data()), (item) => `<li>${escapeHtml(item.item || "Equipment")} ×${Number(item.quantity) || 1}</li>`);
}

const siteTitle = (siteId) => sites.find((site) => site.id === siteId)?.title || "Unknown site";

function showSite(id) {
  const site = sites.find((item) => item.id === id);
  if (!site) return;
  const dateOptions = upcomingCleanupDates().map(({ value, label }) => `<option value="${value}">${label}</option>`).join("");
  byId("dialog-content").innerHTML = `<div class="dialog-body">
    ${site.photoUrl ? `<img class="dialog-photo" src="${escapeHtml(site.photoUrl)}" alt="Reported waste site" />` : ""}
    <span class="badge">${escapeHtml(site.status || "Reported")}</span>
    <h2>${escapeHtml(site.title || "Waste report")}</h2>
    <p>${escapeHtml(site.description || "No description supplied.")}</p>
    <p class="muted">${distanceLabel(site)}</p>
    <div class="dialog-actions"><button class="button primary" id="volunteer-toggle">Volunteer</button><button class="button secondary" id="pledge-toggle">Pledge equipment</button></div>
    <form class="inline-form" id="volunteer-form" hidden>
      <label>Your name<input name="name" required maxlength="80" /></label>
      <label>Cleanup date<select name="cleanupDate" required><option value="" selected disabled>Choose a Saturday</option>${dateOptions}</select></label>
      <label>Optional note<input name="note" maxlength="160" placeholder="e.g. I can bring gloves" /></label>
      <button class="button primary">Confirm volunteer role</button>
    </form>
    <form class="inline-form" id="pledge-form" hidden><label>Your name<input name="name" required maxlength="80" /></label><label>Item<input name="item" required maxlength="80" placeholder="e.g. Refuse bags" /></label><label>Quantity<input name="quantity" type="number" min="1" value="1" required /></label><button class="button primary">Confirm pledge</button></form>
    <p id="contribution-status" class="form-status"></p>
  </div>`;
  byId("volunteer-toggle").onclick = () => { byId("volunteer-form").hidden = !byId("volunteer-form").hidden; };
  byId("pledge-toggle").onclick = () => { byId("pledge-form").hidden = !byId("pledge-form").hidden; };
  byId("volunteer-form").onsubmit = (event) => submitVolunteer(event, site);
  byId("pledge-form").onsubmit = (event) => submitPledge(event, site);
  byId("site-dialog").showModal();
}

async function submitVolunteer(event, site) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const status = byId("contribution-status");
  status.textContent = "Saving…";
  try {
    await addDoc(collection(db, "volunteers"), { siteId: site.id, userId: currentUser.uid, name: form.get("name"), cleanupDate: form.get("cleanupDate"), note: form.get("note") || "", createdAt: new Date().toISOString() });
    if (site.status === "Reported") await updateDoc(doc(db, "sites", site.id), { status: "Volunteers Assigned" });
    status.textContent = "Thank you for volunteering!";
    await loadSites();
  } catch {
    status.textContent = "We could not save this right now. Please try again.";
  }
}

async function submitPledge(event, site) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const status = byId("contribution-status");
  status.textContent = "Saving…";
  try {
    await addDoc(collection(db, "pledges"), { siteId: site.id, userId: currentUser.uid, name: form.get("name"), item: form.get("item"), quantity: Number(form.get("quantity")), createdAt: new Date().toISOString() });
    status.textContent = "Your pledge has been recorded. Thank you!";
    await loadSites();
  } catch {
    status.textContent = "We could not save this right now. Please try again.";
  }
}

function getBrowserLocation() {
  if (!navigator.geolocation) return Promise.reject(new Error("Location is not supported by this browser."));
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
    (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
    () => reject(new Error("Location was not shared.")),
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
  ));
}

async function requestLocation() {
  byId("location-message").textContent = "Requesting your location…";
  try {
    currentLocation = await getBrowserLocation();
    byId("location-message").textContent = "Showing distances from your current location.";
    renderSites();
  } catch {
    byId("location-message").textContent = "Location was not shared. You can still browse all reports.";
  }
}

async function compressPhoto(file) {
  if (!file?.type.startsWith("image/") || !globalThis.createImageBitmap) return file;
  const image = await createImageBitmap(file);
  const maximumDimension = 1440;
  const scale = Math.min(1, maximumDimension / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close?.();
  const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Photo compression failed.")), "image/jpeg", 0.72));
  return new File([blob], `${file.name.replace(/\.[^/.]+$/, "") || "report-photo"}.jpg`, { type: "image/jpeg" });
}

async function uploadPhoto(file) {
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", cloudinary.uploadPreset);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`, { method: "POST", body });
  if (!response.ok) throw new Error("Photo upload failed");
  return (await response.json()).secure_url;
}

byId("locate-button").addEventListener("click", requestLocation);
byId("dialog-close").addEventListener("click", () => byId("site-dialog").close());
byId("report-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = byId("report-status");
  const description = byId("description").value.trim();
  const photo = byId("photo").files[0];
  try {
    if (!currentLocation) {
      status.textContent = "Getting your location…";
      currentLocation = await getBrowserLocation();
    }
    status.textContent = "Reducing photo size…";
    const smallerPhoto = await compressPhoto(photo);
    status.textContent = "Uploading photo and saving your report…";
    const photoUrl = await uploadPhoto(smallerPhoto);
    await addDoc(collection(db, "sites"), { title: description.slice(0, 40), description, latitude: currentLocation.latitude, longitude: currentLocation.longitude, photoUrl, reportedBy: currentUser.uid, status: "Reported", createdAt: new Date().toISOString() });
    event.currentTarget.reset();
    try {
      await loadSites();
      status.textContent = "Report submitted — thank you for helping your community.";
    } catch (refreshError) {
      console.error(refreshError);
      status.textContent = "Success — reload the page to view your reported site.";
    }
  } catch (error) {
    console.error(error);
    status.textContent = error.message === "Location was not shared." ? "Please allow location access to submit a report." : "The report could not be submitted. Please check your connection and try again.";
  }
});

try {
  await ensureUser();
  await loadSites();
} catch (error) {
  console.error(error);
  byId("report-list").innerHTML = '<p class="muted">We could not load reports. Please refresh and try again.</p>';
  byId("activity-list").innerHTML = '<p class="muted">We could not load your activity.</p>';
}
