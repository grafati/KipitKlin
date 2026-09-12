export const byId = (id) => document.getElementById(id);

export const escapeHtml = (text = "") => String(text).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#039;",
  '"': "&quot;",
}[character]));
