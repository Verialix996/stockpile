# 📦 Stockpile

Stockpile is a personal home storage manager. Map out every room, cabinet, shelf, and container in your home, track what's stored where, scan items with AI to identify them automatically, and get alerts when stock runs low. Built with React Native + Expo — runs in the browser, and on Android and iOS via Expo Go.

---

## ✨ Features

### 🏠 Storage Hierarchy
Organize everything across four levels: **Room → Cabinet → Shelf → Item**. Add, rename, and delete at any level. Deleting a room cascades automatically — everything inside is removed with it.

### 📦 Item Tracking
Each item stores:
- Name, quantity, condition (Good / Used / Damaged / Unknown)
- Category (Food, Beverages, Cleaning, Tools, Electronics, Clothing, Documents, Other)
- Expiry date — highlighted in red when expired
- Photo
- Min stock threshold
- Free-text notes

### 🎒 Bags & Containers
Any shelf can hold containers (Bag, Box, Bin, Crate) in addition to regular shelves. Each container has a type icon and badge, holds its own items, and appears in search results with its full location path.

### 📷 Scan Room with AI
Point your camera at a room and Claude AI will suggest a full structure — room name, cabinet names, and shelf names. Review and edit the suggestions before confirming. Creates the entire room hierarchy in one tap.

### 🤖 Scan Container Contents
Point your camera at the contents of a bag or box and Claude AI will detect the items inside. Review the detected items with checkboxes, deselect anything that's wrong, and add the rest to the container in one tap.

### 🤖 AI Item Recognition
Scan a photo of any individual item and Claude AI will identify it and auto-fill the name, category, and description. Available when adding a new item and on any existing item's detail screen.

### ➕ Quick Quantity Controls
Every item card has inline **− and +** buttons to update stock instantly without opening the edit form. Tap the quantity number to type an exact value. When quantity hits 0 a dialog appears — choose to remove the item or keep it and add it to the restock alert list. Available on the items list, search results, and the low stock screen.

### 🔍 Search & Category Filter
Search across all items by name, category, or notes from the home screen. Filter by category using the chip row — each chip shows the live item count. Combine text search and category filter. A live result count and one-tap Clear button keep navigation fast.

### ➕ Global Add Item
Add a new item from the home screen without navigating into a room first. A cascading location picker (Room → Cabinet → Shelf) with filter-as-you-type dropdowns places the item exactly where it belongs.

### 🔔 Low Stock Alerts
Set a minimum quantity threshold on any item. When stock drops to or below that level, a bell icon with a count badge appears on the home screen. The Low Stock screen shows all affected items split into **Out of Stock** and **Running Low**, each with a stock bar, location path, and inline +/- controls.

### 💾 SQLite Persistent Storage
All data is stored in a local SQLite database via a lightweight Node.js server. Data survives browser cache clears, app restarts, and server restarts. Accessible from any device on the same network.

### 🔄 Multi-Device Sync
Any device on the same local network can connect to the server via LAN IP. Changes on one device are visible on all others after a refresh.

### 📤 CSV Export & Import
Export all items to a CSV file with full location data (Room, Cabinet, Shelf) and all item fields. Import CSV files in **merge** mode (add to existing data) or **replace** mode (overwrite everything). On mobile, export opens the native share sheet.

### 🧭 Breadcrumb Navigation
Every screen shows a full breadcrumb trail. Tap any level to jump back instantly.

### 📊 Stats Dashboard
The home screen shows a live count of all rooms, cabinets, shelves, and items.

---

## 📱 Supported Platforms

| Platform | How to run | Status |
|---|---|---|
| **Linux / Windows / Mac** | Any browser → `http://localhost:8082` | ✅ Supported |
| **Android phone** | Expo Go app — scan QR code | ✅ Supported |
| **iPhone / iPad** | Expo Go app — scan QR code | ✅ Supported |
| **Google Play Store** | Native Android build | 🔲 Planned |
| **Apple App Store** | Native iOS build | 🔲 Planned |

---

## 🚀 Getting Started

### Option 1 — Docker (recommended)

The easiest way to run Stockpile. No Node.js installation required.

```bash
git clone https://github.com/Verialix996/stockpile.git
cd stockpile
docker compose up
```

Open **http://localhost:8082** in your browser.
The API server runs on port 3747. Data is persisted in the `data/` folder.

To run in the background:
```bash
docker compose up -d
```

To stop:
```bash
docker compose down
```

---

### Option 2 — Manual setup

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

```bash
npm run dev
```
Open **http://localhost:8082** in your browser. The data server starts automatically on port 3747.

### Run on Android / iPhone
1. Install **Expo Go** from the Play Store or App Store
2. Make sure your phone and the host machine are on the same Wi-Fi
3. Run `npx expo start` (in a separate terminal alongside `node server.js`) and scan the QR code
4. In the app go to **Settings → Server URL** and set it to the LAN IP shown in the terminal (e.g. `http://192.168.1.x:3747`)

---

## ⚙️ AI Setup

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account and add billing credits ($5 is plenty for extended use)
3. Create an API key
4. In the app tap **⚙️ Settings** → paste your key → tap **Save Key**

AI features: item photo scan, room scan, container contents scan.

---

## 📁 Project Structure

```
stockpile/
├── App.js                         # Entry point + navigation stack
├── server.js                      # SQLite data server + Claude API proxy
├── app.json                       # Expo config
├── package.json                   # Dependencies
└── src/
    ├── context/
    │   ├── DBContext.js           # App data state + all CRUD operations
    │   └── MapContext.js          # Floor plan map state (pending rework)
    ├── hooks/
    │   └── useQuantityControl.js  # Shared +/- qty logic and zero qty dialog
    ├── utils/
    │   ├── db.js                  # Load/save data via server with local fallback
    │   ├── serverUrl.js           # Server URL storage and retrieval
    │   ├── csvIO.js               # CSV build, parse, export, import
    │   ├── apiKey.js              # API key storage + Claude AI calls
    │   └── theme.js               # Colors, spacing, categories, constants
    ├── components/
    │   ├── UI.js                  # Cards, FAB, search bar, breadcrumb, stats
    │   └── modals/
    │       ├── Modals.js          # Add/edit item modal with AI scan
    │       ├── GlobalAddItemModal.js  # Add item from home with location picker
    │       └── ZeroQtyModal.js    # Zero quantity dialog
    └── screens/
        ├── RoomsScreen.js         # Home screen — search, filter, stats
        ├── CabinetsScreen.js      # Cabinet list
        ├── ShelvesScreen.js       # Shelf + container list
        ├── ItemsScreen.js         # Item list with inline qty controls
        ├── ItemDetailScreen.js    # Item detail, photo, AI scan
        ├── LowStockScreen.js      # Out of stock + running low dashboard
        ├── ScanRoomScreen.js      # AI room scan and review
        └── SettingsScreen.js      # Server URL, API key, CSV export/import
```

---

## 🛠️ Built With

- [React Native](https://reactnative.dev) + [Expo](https://expo.dev) SDK 54
- [React Navigation](https://reactnavigation.org)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — server-side SQLite
- [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/) — mobile file access
- [expo-document-picker](https://docs.expo.dev/versions/latest/sdk/document-picker/) — CSV import on mobile
- [expo-sharing](https://docs.expo.dev/versions/latest/sdk/sharing/) — CSV export on mobile
- [Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) — photos
- [Anthropic Claude API](https://docs.anthropic.com) — AI photo and room scanning

---

## 📄 License

Private project — all rights reserved.
