// Live Apps Script web app (same backend as the rider web page and admin dashboard)
export const API_URL =
  'https://script.google.com/macros/s/AKfycbw6lYSnufAztz7328qLjICRjNHdhyTfq2YPvQkSMe0c7zIGh8jiy2yJ3qBFY6KuUv7lKg/exec';

export const LOCATION_TASK = 'sfx-rider-location';
export const PING_INTERVAL_MS = 60 * 1000; // at most one location per minute...
export const PING_DISTANCE_M = 50; // ...or every 50 m of movement
export const GPS_CHECK_MS = 15 * 1000;
export const REFRESH_MS = 30 * 1000; // home screen refresh from server
export const RESEND_OTP_SECONDS = 30;

export const COLORS = {
  ink: '#231f20',
  green: '#008a71',
  darkGreen: '#005c4a',
  lime: '#d5d226',
  grey: '#6b7280',
  rule: '#e2e8f0',
  tint: '#f0f7f4',
  red: '#c0392b',
  redTint: '#fdecea',
  amber: '#b7791f',
  white: '#ffffff',
  bg: '#f7f9f8',
};
