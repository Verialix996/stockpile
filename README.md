# 📦 Stockpile

A dark-mode home storage manager built with React Native + Expo.  
Organize every room, cabinet, shelf, and item in your home — runs in the browser today, ready for Android and iOS tomorrow.

---

## ✨ Current Features

### 🏠 4-Level Storage Hierarchy
Organize your home storage in a structured, intuitive way:
```
Room → Cabinet → Shelf → Item
```
- Add, rename, and delete at every level
- Deleting a room cascades — automatically removes all cabinets, shelves, and items inside it

### 🔍 Global Search
- Search across every item in every room from the home screen
- Searches by item name and category
- Each result shows the full location path (e.g. `Kitchen › Upper Cabinet › Shelf 1`)

### 📦 Item Tracking
Each item stores:
| Field | Details |
|---|---|
| **Name** | What the item is |
| **Quantity** | How many you have |
| **Condition** | Good / Used / Damaged / Unknown (color coded) |
| **Category** | Food, Beverages, Cleaning, Tools, Electronics, Clothing, Documents, Other |
| **Expiry Date** | Highlighted in red when expired |
| **Photo** | Attach an image from your files |
| **Notes** | Any free-text notes |

### 💾 Persistent Storage
- All data saves automatically — no manual save needed
- Data survives closing and reopening the app
- Pre-loaded with sample data to explore right away

### 🧭 Breadcrumb Navigation
- Every screen shows a breadcrumb trail (e.g. `Rooms › Kitchen › Upper Cabinet`)
- Tap any crumb to jump directly back to that level

### 📊 Stats Dashboard
- Home screen shows a live count of total rooms, cabinets, shelves, and items

### 🎨 Design
- Full dark mode
- Mobile-optimized layout
- Smooth bottom-sheet modals for adding and editing

---

## 🚀 Running the App

### Prerequisites
- Node.js v20+ (install via nvm — see below)
- npm

### First time setup
```bash
# Install nvm (no sudo needed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20

# Clone and install
git clone https://github.com/Verialix996/stockpile.git
cd stockpile
npm install
```

### Run in browser (Steam Deck / Linux)
```bash
npm run web
```
Open **http://localhost:8081** in Firefox.  
For mobile view: press `F12` → click the phone icon → select Pixel 7.

### Run on Android phone (Expo Go)
1. Install **Expo Go** from the Play Store
2. Make sure your phone and computer are on the same Wi-Fi
3. Run `npm start` and scan the QR code with your camera

---

## 📁 Project Structure

```
stockpile/
├── App.js                        # Entry point + navigation
├── app.json                      # Expo config (bundle ID, platforms)
├── package.json                  # Dependencies
├── assets/                       # App icons and splash screen
└── src/
    ├── context/
    │   └── DBContext.js          # Global state + all data operations
    ├── utils/
    │   ├── db.js                 # AsyncStorage load/save + seed data
    │   └── theme.js              # Colors, spacing, shared constants
    ├── components/
    │   ├── UI.js                 # Cards, FAB, search bar, breadcrumb, stats
    │   └── Modals.js             # Add/edit bottom sheet modals
    └── screens/
        ├── RoomsScreen.js        # Home screen + global search
        ├── CabinetsScreen.js     # Cabinet list
        ├── ShelvesScreen.js      # Shelf list
        ├── ItemsScreen.js        # Item list
        └── ItemDetailScreen.js   # Item detail + photo picker
```

---

## 🗺️ Roadmap

- [ ] Barcode / QR code scanning
- [ ] Low stock alerts
- [ ] Sort and filter items
- [ ] Export / backup data
- [ ] Multi-device sync
- [ ] Light mode toggle
- [ ] Publish to Google Play Store
- [ ] Publish to Apple App Store

---

## 🛠️ Built With

- [React Native](https://reactnative.dev)
- [Expo](https://expo.dev)
- [React Navigation](https://reactnavigation.org)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- [Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)

---

## 📄 License

Private project — all rights reserved.
