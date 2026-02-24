# 📦 Stockpile — Setup Guide

## Running on Steam Deck (Browser) — Do This First

### Step 1 — Switch to Desktop Mode
Press Steam button → Power → Switch to Desktop

### Step 2 — Open Konsole (terminal)
Find it in the taskbar or app launcher

### Step 3 — Install Node.js via nvm (no sudo, survives updates)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node --version   # should show v20.x.x
```

### Step 4 — Unzip and install dependencies
```bash
unzip stockpile.zip
cd stockpile
npm install
```

### Step 5 — Run in browser
```bash
npm run web
```
Open **Firefox** and go to: **http://localhost:8081**

**For mobile view in Firefox:**
Press F12 → click the phone/tablet icon (or Ctrl+Shift+M) → select Pixel 7

---

## Daily workflow (after first setup)
```bash
cd stockpile
npm run web
```
One command and you're running.

---

## Future: Test on Android phone with Expo Go

1. Install **Expo Go** from the Play Store on your phone
2. Make sure your phone and Steam Deck are on the same Wi-Fi network
3. In the stockpile folder run:
   ```bash
   npm start
   ```
4. Scan the QR code shown in the terminal with your phone camera

---

## Future: Publish to App Stores

### Android (Google Play) — $25 one-time fee
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile production
```
Upload the `.aab` file at https://play.google.com/console

### iOS (Apple App Store) — $99/year
```bash
eas build --platform ios --profile production
eas submit --platform ios
```
Manage at https://appstoreconnect.apple.com

---

## Project structure
```
stockpile/
├── App.js                        # Entry point + navigation
├── app.json                      # Expo config (bundle ID, icons, etc.)
├── package.json                  # Dependencies
├── assets/                       # Add icon.png (1024x1024) here
└── src/
    ├── context/
    │   └── DBContext.js          # Global state + data persistence
    ├── utils/
    │   ├── db.js                 # AsyncStorage load/save + seed data
    │   └── theme.js              # Colors, spacing, constants
    ├── components/
    │   ├── UI.js                 # Cards, FAB, search bar, breadcrumb
    │   └── Modals.js             # Add/edit bottom sheet modals
    └── screens/
        ├── RoomsScreen.js        # Home + global search
        ├── CabinetsScreen.js
        ├── ShelvesScreen.js
        ├── ItemsScreen.js
        └── ItemDetailScreen.js   # Item detail + photo picker
```

---

## All commands

| Command | What it does |
|---|---|
| `npm run web` | Run in browser (Steam Deck) |
| `npm start` | Expo dev server (QR code for Expo Go) |
| `npm run android` | Open in Android emulator |
| `npm run ios` | Open in iOS simulator (Mac only) |
| `eas build --platform android` | Build Android store release |
| `eas build --platform ios` | Build iOS store release |
| `eas submit --platform android` | Upload to Google Play |
| `eas submit --platform ios` | Upload to App Store |
