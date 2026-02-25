# 📦 Stockpile

Stockpile is a personal home storage manager. It lets you map out every room, cabinet, and shelf in your home, track what's stored where, attach photos, and use AI to identify items automatically. Built with React Native + Expo — runs in the browser today, ready for Android and iOS whenever you need it.

---

## ✨ Current Features

**🏠 4-Level Storage Hierarchy**
Organize everything as Room → Cabinet → Shelf → Item. Add, rename, and delete at any level. Deleting a room cascades and removes everything inside it automatically.

**🔍 Global Search**
Search across every item in the entire home from the home screen, by name or category. Each result shows the full location path so you always know exactly where something is.

**📦 Item Tracking**
Each item stores name, quantity, condition (Good / Used / Damaged / Unknown), category, expiry date, photo, and free-text notes. Expired items are highlighted in red.

**🤖 AI Photo Recognition**
Take a photo of any item and Claude AI will identify it and auto-fill the name, category, and a short description. Uses the user's own Anthropic API key — no cost to the developer.

**🗺️ Floor Plan Maps**
Draw a grid-based floor plan for each room using walls, doors, windows, colored room zones, and cabinet markers. Place cabinets on the map and tap them in view mode to navigate directly to that cabinet's contents. The Whole Home overview auto-merges all room maps side by side.

**💾 File-Based Persistence**
Data is saved to a local JSON file on disk via a lightweight Node.js server, so it persists across all browsers and survives cache clears. Mobile builds use native AsyncStorage.

**🧭 Breadcrumb Navigation**
Every screen shows a breadcrumb trail. Tap any crumb to jump back to that level instantly.

**📊 Stats Dashboard**
The home screen shows a live count of all rooms, cabinets, shelves, and items.

---

## 🗺️ Roadmap

**Search & Discovery**
- [ ] Filter and search items by category
- [ ] Sort items by name, quantity, expiry date, or condition
- [ ] Barcode / QR code scanning to identify items

**Stock Management**
- [ ] Low stock alerts — user sets a minimum quantity per item, gets notified when stock falls below it
- [ ] Notification board — a central dashboard showing all upcoming restocks, low stock items, and expiring items in one place
- [ ] Check stock against a new order — import or enter a shopping list and see what you already have vs what you still need
- [ ] Restock reminders — schedule recurring reminders for items you regularly run out of

**Data & Backup**
- [ ] Export data to JSON or CSV
- [ ] Import / restore from backup file
- [ ] Multi-device sync via cloud storage

**Design & UX**
- [ ] Light mode toggle
- [ ] Custom categories
- [ ] Bulk edit items

**Platform**
- [ ] Publish to Google Play Store
- [ ] Publish to Apple App Store

---

## 🚀 Running the App

**First time setup (Steam Deck / Linux)**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
git clone https://github.com/Verialix996/stockpile.git
cd stockpile
npm install
```

**Run (two processes, one command)**
```bash
npm run dev
```
Open Firefox → **http://localhost:8081**

**Run on Android phone**
Install Expo Go from the Play Store, connect to the same Wi-Fi, then run `npm start` and scan the QR code.

---

## 📁 Project Structure

```
stockpile/
├── App.js                          # Entry point + navigation
├── server.js                       # Local data server (file-based persistence)
├── app.json                        # Expo config
├── package.json                    # Dependencies
└── src/
    ├── context/
    │   ├── DBContext.js            # Storage data + all CRUD operations
    │   └── MapContext.js           # Floor plan map state
    ├── utils/
    │   ├── db.js                   # Load/save to file or AsyncStorage
    │   ├── mapStorage.js           # Map load/save + cell type definitions
    │   ├── apiKey.js               # API key storage + Claude AI integration
    │   └── theme.js                # Colors, spacing, constants
    ├── components/
    │   ├── UI.js                   # Cards, FAB, search bar, breadcrumb, stats
    │   └── Modals.js               # Add/edit bottom sheet modals
    └── screens/
        ├── RoomsScreen.js          # Home screen + global search
        ├── CabinetsScreen.js       # Cabinet list
        ├── ShelvesScreen.js        # Shelf list
        ├── ItemsScreen.js          # Item list
        ├── ItemDetailScreen.js     # Item detail + photo + AI scan
        ├── MapsListScreen.js       # Floor plan overview
        ├── MapScreen.js            # Grid map editor
        └── SettingsScreen.js       # API key management
```

---

## 🛠️ Built With

- [React Native](https://reactnative.dev) + [Expo](https://expo.dev)
- [React Navigation](https://reactnavigation.org)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- [Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Anthropic Claude API](https://docs.anthropic.com) — AI photo recognition

---

## 📄 License

Private project — all rights reserved.
