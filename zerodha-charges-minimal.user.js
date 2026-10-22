// ==UserScript==
// @name         Zerodha Charges (Minimal)
// @namespace    https://github.com/pranav824/zerodha-charges-minimal
// @version      1.4.0
// @description  Adds charges column to Zerodha orders page
// @author       pranav824
// @match        https://kite.zerodha.com/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/pranav824/zerodha-charges-minimal/main/zerodha-charges-minimal.user.js
// @updateURL    https://raw.githubusercontent.com/pranav824/zerodha-charges-minimal/main/zerodha-charges-minimal.user.js
// ==/UserScript==

(function() {
    'use strict';

    const getToken = () => document.cookie.match(/enctoken=([^;]+)/)?.[1];
    let lastUrl = '';
    let isProcessing = false;
    let debounceTimer = null;

    function scheduleMain() {
        if (isProcessing) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(main, 300);
    }

    async function main() {
        if (isProcessing) return;
        if (!location.pathname.includes('order')) return;

        const table = findOrdersTable();
        if (!table) return;

        isProcessing = true;
        clearTimeout(debounceTimer);

        try {
            const token = getToken();
            if (!token) return;

            // Fetch all data FIRST (keep existing column visible during fetch)
            const ordersRes = await fetch('/oms/orders', {
                headers: { 'Authorization': `enctoken ${token}` }
            });
            const allOrders = (await ordersRes.json()).data || [];

            // Sort to match Kite web UI display order: newest first, and within the
            // same second, highest order_id first. The API returns oldest-first, but
            // the web page renders newest-first. Without this sort, the positional
            // charge matching (chargeIdx++) assigns charges to the wrong DOM rows.
            // Tiebreaker: Kite sub-sorts same-second orders by order_id descending
            // (most recently placed order shown first within the same timestamp).
            allOrders.sort((a, b) => {
                const tsDiff = new Date(b.order_timestamp) - new Date(a.order_timestamp);
                if (tsDiff !== 0) return tsDiff;
                return (b.order_id || '').localeCompare(a.order_id || '');
            });

            const completedOrders = allOrders.filter(o => o.status === 'COMPLETE' && o.average_price > 0);

            let charges = [];
            if (completedOrders.length > 0) {
                const chargesRes = await fetch('/oms/charges/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `enctoken ${token}`
                    },
                    body: JSON.stringify(completedOrders.map(o => ({
                        order_id: o.order_id,
                        exchange: o.exchange,
                        tradingsymbol: o.tradingsymbol,
                        transaction_type: o.transaction_type,
                        quantity: o.quantity,
                        average_price: o.average_price,
                        product: o.product,
                        variety: o.variety,
                        order_type: o.order_type
                    })))
                });
                charges = (await chargesRes.json()).data || [];
            }

            // NOW update DOM (data ready - minimize visual disruption)
            const freshTable = findOrdersTable();
            if (!freshTable) return;

            const dataRows = getDataRows(freshTable);
            const hasValidStructure =
                freshTable.querySelector('thead th.zc-col') &&
                freshTable.querySelectorAll('tbody td.zc-col').length === dataRows.length;

            if (hasValidStructure) {
                // Structure matches - update values in place (no flicker)
                updateChargesInPlace(freshTable, charges);
            } else {
                // Structure mismatch - recreate column
                freshTable.querySelectorAll('.zc-col').forEach(el => el.remove());
                injectColumn(freshTable, charges);
            }
        } finally {
            isProcessing = false;
        }
    }

    function findOrdersTable() {
        return [...document.querySelectorAll('table')].find(t =>
            t.querySelector('thead')?.textContent.toLowerCase().includes('instrument')
        );
    }

    function getDataRows(table) {
        return [...table.querySelectorAll('tbody tr')]
            .filter(r => !r.classList.contains('expandable') && !r.classList.contains('expanded'));
    }

    function updateChargesInPlace(table, charges) {
        const dataRows = getDataRows(table);

        let chargeIdx = 0;
        for (const row of dataRows) {
            const chargeCell = row.querySelector('td.zc-col');
            if (!chargeCell) continue;

            // Status cell is right after our charge cell (we inserted before status)
            const status = chargeCell.nextElementSibling?.textContent.trim().toUpperCase() || '';

            if (status === 'COMPLETE') {
                const charge = charges[chargeIdx]?.charges?.total || 0;
                chargeIdx++;
                chargeCell.textContent = charge.toFixed(2);
                chargeCell.style.color = charge > 0 ? '#d32f2f' : '#666';
            } else {
                chargeCell.textContent = '-';
                chargeCell.style.color = '#666';
            }
        }
    }

    function injectColumn(table, charges) {
        const headerRow = table.querySelector('thead tr');
        if (!headerRow) return;

        const headers = [...headerRow.children];
        const statusIdx = headers.findIndex(h => h.textContent.trim().toLowerCase() === 'status');
        if (statusIdx === -1) return;

        // Add header before Status column
        const th = document.createElement('th');
        th.className = 'zc-col right';
        th.textContent = 'Chgs.';
        headerRow.insertBefore(th, headers[statusIdx]);

        const dataRows = getDataRows(table);

        let chargeIdx = 0;
        for (const row of dataRows) {
            const cells = [...row.children];
            const status = cells[statusIdx]?.textContent.trim().toUpperCase();

            const td = document.createElement('td');
            td.className = 'zc-col right';

            if (status === 'COMPLETE') {
                const charge = charges[chargeIdx]?.charges?.total || 0;
                chargeIdx++;
                td.textContent = charge.toFixed(2);
                td.style.color = charge > 0 ? '#d32f2f' : '#666';
            } else {
                td.textContent = '-';
                td.style.color = '#666';
            }

            row.insertBefore(td, cells[statusIdx]);
        }

        // Fix colspan on expanded rows
        for (const row of table.querySelectorAll('tbody tr.expandable, tbody tr.expanded')) {
            const cell = row.children[0];
            if (cell?.colSpan > 1) cell.colSpan++;
        }
    }

    function checkAndRun() {
        const currentUrl = location.href;

        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            if (location.pathname.includes('order')) {
                scheduleMain();
            }
        } else if (location.pathname.includes('order')) {
            const table = findOrdersTable();
            if (table && !table.querySelector('.zc-col')) {
                scheduleMain();
            }
        }
    }

    new MutationObserver(checkAndRun).observe(document.body, { childList: true, subtree: true });
    checkAndRun();
})();