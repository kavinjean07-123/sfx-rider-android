import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

const TOKEN_KEY = 'sfx_rider_token';
let onSessionLost = null;

// App.js registers this so an expired/removed rider is sent back to login.
export function setSessionLostHandler(fn) {
  onSessionLost = fn;
}

// Calls a rider function on the Apps Script backend (doPost). Always resolves to {ok,...}.
export async function call(action, ...args) {
  const out = await callOnce(action, args);
  // Apps Script occasionally returns an HTML page on a cold start — retry once.
  if (out.code === 'SERVER') {
    await new Promise((r) => setTimeout(r, 1500));
    return callOnce(action, args);
  }
  return out;
}

async function callOnce(action, args) {
  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, args }),
    });
  } catch (e) {
    return { ok: false, code: 'NETWORK', error: 'No internet. Please try again.' };
  }
  const text = await res.text();
  let out;
  try {
    out = JSON.parse(text);
  } catch (e) {
    return { ok: false, code: 'SERVER', error: 'Server is busy. Please try again.' };
  }
  if (!out.ok && (out.code === 'SESSION_EXPIRED' || out.code === 'NOT_REGISTERED')) {
    await setToken(null);
    if (onSessionLost) onSessionLost(out.error);
  }
  return out;
}

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export async function setToken(token) {
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (e) {}
}

export function normalizePhone(input) {
  const d = String(input || '').replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

export const dcsOf = (net, city) => ((net || []).find((c) => c.city === city)?.dcs || []).map((d) => d.dc);
export const cpcsOf = (net, city, dc) =>
  (net || []).find((c) => c.city === city)?.dcs.find((d) => d.dc === dc)?.cpcs || [];
