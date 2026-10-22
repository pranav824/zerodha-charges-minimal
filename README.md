# Zerodha Charges (Minimal)

A lightweight Tampermonkey user script designed for Zerodha Kite (`kite.zerodha.com`) that automatically calculates and inserts a **Charges** column into your Orders page, showing exact transactional costs for completed orders.

## Features
* **Seamless Integration:** Adds a clean "Chgs." column right before the Status column on the Zerodha Orders table.
* **Smart Sorting & Matching:** Automatically handles API order sorting to ensure charges align perfectly with your UI rows.
* **Color-Coded Costs:** Highlights charges clearly (red for paid costs, muted for zero-charge/pending rows).
* **Zero Overhead:** Runs locally in your browser using your active session token securely in-memory. No external servers or data storage are involved.

---

## Installation

### Method 1: Direct Install via Tampermonkey (Recommended)
1. Make sure you have the [Tampermonkey](https://www.tampermonkey.net/) extension installed in your browser (Chrome, Firefox, Edge, etc.).
2. Go to the [Releases/Repository Files link or Greasy Fork page].
3. Click on the `zerodha-charges-minimal.user.js` file.
4. Tampermonkey will automatically detect the `.user.js` file and prompt you with an **Install** screen. Click **Install**.

### Method 2: Manual Install
1. Open your Tampermonkey Dashboard and click on the **Utilities** tab or click the **"+" (Create new script)** icon.
2. Copy the entire contents of `zerodha-charges-minimal.user.js`.
3. Paste it into the editor and press `Ctrl + S` (or `Cmd + S`) to save.

---

## How It Works
* The script listens for page navigation changes on the Zerodha Kite web app.
* When you visit the orders page, it securely reads your existing session token (`enctoken`) from cookies to query Zerodha's internal OMS endpoints (`/oms/orders` and `/oms/charges/orders`).
* It computes the final fee structure locally and updates the Document Object Model (DOM) seamlessly without disrupting your layout.

---

## Security & Privacy
* This script runs **100% locally** in your browser.
* It only interacts with official Zerodha endpoints using your active, logged-in session cookies.
* It does not log, store, or transmit your credentials or financial data to any third-party servers.

---

## License
This project is open source and available under the [MIT License](LICENSE).