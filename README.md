# 📦 Stockpile

Stockpile is a personal home storage manager. It lets you map out every room, cabinet, and shelf in your home, track what's stored where, scan items with AI to identify them automatically, and get alerts when stock runs low. Built with React Native + Expo — runs in the browser today, ready for Android and iOS whenever you need it.

---

## ✨ Current Features

### 🏠 Storage Hierarchy
Organize everything across four levels: **Room → Cabinet → Shelf → Item**. Add, rename, and delete at any level. Deleting a room cascades automatically — everything inside is removed with it.

### 📦 Item Tracking
Each item stores:
- Name, quantity, condition (Good / Used / Damaged / Unknown)
- Category (Food, Beverages, Cleaning, Tools, Electronics, Clothing, Documents, Other)
- Expiry date — highlighted in red when expired
- Photo
- Free-text notes

### ➕ Quick Quantity Controls
Every item card has inline **− and +** buttons so you can update stock levels instantly without opening the edit form. Tap the quantity number to type an exact value directly. Available on the items list, search results, and the low stock screen.

### 🔍 Search & Category Filter
Search across all items by name, category, or notes from the home screen. Filter by category using the chip row — each chip shows the item count. Combine text search and category filter together. A live result count and one-tap Clear button make it easy to navigate.

### ➕ Add Item from Anywhere
Add a new item directly from the home screen without navigating into a room first. A cascading location picker (Room → Cabinet → Shelf) with filter-as-you-type dropdowns lets you place the item exactly where it belongs in seconds.

### 🤖 AI Photo Recognition
Scan a photo of any item and Claude AI will identify it and auto-fill the name, category, and description. Available both when adding a new item and on any existing item's detail screen. Uses the user's own Anthropic API key — no subscription required.

### 🔔 Low Stock Alerts
Set a minimum quantity threshold on any item. When stock drops to or below that level, a bell icon with a count badge appears on the home screen. The dedicated Low Stock screen shows all affected items split into **Out of Stock** and **Running Low**, each with a visual stock bar, location path, and inline +/- controls to restock immediately.

### 🗺️ Floor Plan Maps
Draw grid-based floor plans for each room using walls, doors, windows, colored room zones, and cabinet markers. Place real cabinets on the map and tap them in view mode to navigate directly to that cabinet's contents. The **Whole Home** map auto-merges all room maps side by side — always up to date, no manual drawing needed.

### 💾 Persistent Storage
Data is saved to a local JSON file via a lightweight Node.js server — survives browser cache clears and works across all browsers. On mobile builds, AsyncStorage is used instead.

### 🧭 Breadcrumb Navigation
Every screen shows a breadcrumb trail. Tap any level to jump back instantly.

### 📊 Stats Dashboard
The home screen shows a live count of all rooms, cabinets, shelves, and items.

---

## 📱 Supported Devices

| Platform | How to run | Status |
|---|---|---|
| **Linux desktop** | Any browser → `http://localhost:8082` | ✅ Fully supported |
| **Windows / Mac** | Any browser → `http://localhost:8082` | ✅ Fully supported |
| **Android phone** | Expo Go app (scan QR code) | ✅ Supported |
| **iPhone / iPad** | Expo Go app (scan QR code) | ✅ Supported |
| **Google Play Store** | Native Android build | 🔲 Planned |
| **Apple App Store** | Native iOS build | 🔲 Planned |

---

## 🚀 Running the App

### First time setup
```bash
# Install Node.js via nvm (no sudo needed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20

# Clone and install
git clone https://github.com/Verialix996/stockpile.git
cd stockpile
npm install
```

### Run (Desktop)
```bash
npm run dev
```
Open **http://localhost:8082** in your browser.
For mobile view on Steam Deck: press `F12` → click the phone icon → select a device.

### Run on Android / iPhone
1. Install **Expo Go** from the Play Store or App Store
2. Make sure your phone and computer are on the same Wi-Fi
3. Run `npm start` and scan the QR code with your camera

---

## ⚙️ AI Setup

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account and add billing credits ($5 is plenty)
3. Create an API key
4. In the app tap **⚙️ Settings** → paste your key → tap **Save Key**

---

## 📁 Project Structure

```
stockpile/
├── App.js                            # Entry point + navigation
├── server.js                         # Local data + Claude API proxy server
├── app.json                          # Expo config
├── package.json                      # Dependencies
└── src/
    ├── context/
    │   ├── DBContext.js              # Storage data + all CRUD operations
    │   └── MapContext.js             # Floor plan map state
    ├── utils/
    │   ├── db.js                     # Load/save data
    │   ├── mapStorage.js             # Map load/save + cell types
    │   ├── apiKey.js                 # API key storage + Claude AI calls
    │   └── theme.js                  # Colors, spacing, constants
    ├── components/
    │   ├── UI.js                     # Cards, FAB, search bar, breadcrumb, stats
    │   ├── Modals.js                 # Add/edit item modals with AI scan
    │   └── GlobalAddItemModal.js     # Add item from home screen with location picker
    └── screens/
        ├── RoomsScreen.js            # Home screen, search, category filter
        ├── CabinetsScreen.js         # Cabinet list
        ├── ShelvesScreen.js          # Shelf list
        ├── ItemsScreen.js            # Item list with inline +/- controls
        ├── ItemDetailScreen.js       # Item detail, photo, AI scan, qty control
        ├── LowStockScreen.js         # Low stock and out of stock dashboard
        ├── MapsListScreen.js         # Floor plan overview
        ├── MapScreen.js              # Grid map editor
        └── SettingsScreen.js         # API key management
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
