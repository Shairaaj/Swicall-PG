// src/utils/deviceId.js
export function getOrCreateDeviceId() {
  if (typeof window === "undefined") return null;

  const key = "swicall_device_id";
  let existing = window.localStorage.getItem(key);
  if (existing) return existing;

  let guid;
  if (window.crypto && window.crypto.randomUUID) {
    guid = window.crypto.randomUUID();
  } else {
    // fallback simple GUID
    guid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  window.localStorage.setItem(key, guid);
  return guid;
}
