"use client";

function pushDataLayer(eventName, payload = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...payload,
  });
}

export function trackConversionEvent(eventName, payload = {}) {
  pushDataLayer(eventName, payload);
}

