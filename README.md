# 📦 Stockpile

A lightweight, browser-based **inventory manager** built with vanilla HTML, CSS, and JavaScript — no server, no dependencies, just open and go.

## Features

- **Add / edit / delete** inventory items
- **Instant quantity controls** (+ / − buttons on every card)
- **Low-stock alerts** – set a per-item threshold; cards are highlighted when stock is low or zero
- **Search & category filter** – find items instantly
- **Summary bar** – total items, total units, and low-stock count at a glance
- **Persistent storage** – data is saved in `localStorage`, survives page reloads
- **Responsive** – works on desktop and mobile

## Usage

Open `index.html` in any modern browser — no build step required.

| Action | How |
|---|---|
| Add an item | Click **+ Add Item** and fill in the form |
| Change quantity | Use the **−** / **+** buttons on the card, or edit the item |
| Edit an item | Click the ✏️ icon |
| Delete an item | Click the 🗑️ icon |
| Set low-stock alert | Enter a threshold when adding/editing an item |
| Filter by category | Use the category dropdown in the toolbar |

## Tech Stack

- Plain HTML5, CSS3, JavaScript (ES6+)
- `localStorage` for client-side persistence
- Zero external dependencies
