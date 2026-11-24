# SFX Rider — Android app

Android app for Shadowfax pickup riders. Riders log in with **mobile number + OTP**, pick **City → DC → CPC**
(e.g. Delhi → Bamnoli DC → DEL_Sultanpuri_CPC), tap **Start duty**, and the phone sends GPS every minute
(or every 50 m) **even with the screen locked**. Riders can also log **pickup check-ins**.

It uses the live Apps Script backend (`API_URL` in `src/config.js`), so riders, OTPs, live positions and pickups
show on the same admin dashboard and data sheet as the web version. No Firebase is needed.

## Build the APK

### Option A: GitHub Actions (no setup on your PC)
1. Create a GitHub repo (public, so riders can download the APK without a GitHub login) and push this folder.
2. The workflow in `.github/workflows/build-android.yml` runs automatically (about 15–20 min).
3. Download from the repo's **Releases → latest → SFX-Rider.apk**. The link stays the same for every new build:
   `https://github.com/<you>/<repo>/releases/latest/download/SFX-Rider.apk`

### Option B: Expo EAS (free Expo account)
```bash
npm install
npx eas-cli login
npx eas-cli build -p android --profile preview
```
EAS gives you an APK download link.

## Rider phone setup (one time)
- Install the APK and allow **Install unknown apps** for the browser/WhatsApp.
- Location permission → **Allow all the time**.
- Settings → Battery → SFX Rider → **Unrestricted**. On Xiaomi, Oppo, Vivo and Realme, also turn **Autostart ON**.
  Otherwise the phone kills tracking after a while.

## Notes
- While on duty, Android shows a permanent "Shadowfax Rider · On duty" notification. This is required for background GPS.
- OTP is in **test mode** until an SMS key is added in Apps Script → Script properties (`SMS_MODE = FAST2SMS`, `FAST2SMS_KEY`).
  In test mode the OTP appears on the admin page.
- For the Play Store, build `--profile production` (AAB). It needs a Google Play Console account (one-time USD 25).
