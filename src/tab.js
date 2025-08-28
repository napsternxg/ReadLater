/* Tab page script for listing/searching/removing saved links.
   Depends on core.js which provides readLater(storage). */

(function () {
    const readLaterObject = readLater(chrome.storage.sync);

    // helper: prefer ID lookups (non-breaking) but allow shared class fallbacks
    function getEl(id, classFallback) {
        return document.getElementById(id) || document.querySelector(classFallback || ('#' + id));
    }

    const searchInput = getEl('searchInput', '.section-controls input[type="search"]');
    const linksTableBody = document.querySelector('#linksTable tbody');
    const emptyState = document.getElementById('emptyState');
    const refreshBtn = getEl('refreshBtn', '.section-controls button[title="Refresh list"]');
    const downloadBtn = getEl('downloadBtn', '.section-controls button[title="Download JSON"]');
    const enableSyncLink = getEl('enableSyncLink', 'a.mini-cta');
    const savedCountEl = getEl('savedCount', '.saved-count #savedCount');
    const clearSavedBtn = getEl('clearSavedBtn', '.section-controls button[title="Clear saved links"]');

    // Open tabs elements
    const tabsTableBody = document.querySelector('#tabsTable tbody');
    const refreshTabsBtn = getEl('refreshTabsBtn', '.tabs-controls button[title="Refresh open tabs"]');
    const addAllTabsBtn = getEl('addAllTabsBtn', '.tabs-controls button[title="Add all open tabs"]');
    const dropDuplicatesBtn = getEl('dropDuplicatesBtn', '.tabs-controls button[title^="Close duplicate"]');
    const tabsEmptyState = document.getElementById('tabsEmptyState');
    const searchTabsInput = getEl('searchTabsInput', '.tabs-controls input[type="search"]');
    const totalTabsCount = getEl('totalTabsCount', '.tabs-controls .tabs-count');
    const moveTargetWindow = getEl('moveTargetWindow', '.tabs-controls #moveTargetWindow');
    const moveTabsBtn = getEl('moveTabsBtn', '.tabs-controls #moveTabsBtn');
    const tabsPermissionBtn = getEl('tabsPermissionBtn', '#permButtons #tabsPermissionBtn');
    const permListEl = document.getElementById('permList');

    // in-memory tabs and sort state
    let currentTabs = [];
    let currentSort = { col: 'title', asc: true };
    let selectedTabIds = new Set();

    function updateMoveButtonState() {
        if (!moveTabsBtn || !moveTargetWindow) return;
        moveTabsBtn.disabled = selectedTabIds.size === 0 || !moveTargetWindow.value;
    }

    // Utility: format timestamp
    function fmtDate(ts) {
        try {
            const d = new Date(ts);
            return d.toLocaleString();
        } catch (e) {
            return String(ts);
        }
    }

    // Utility: favicon + title HTML
    function titleWithFavicon(title, url) {
        const domain = (url || '').replace(/^https?:\/\//i, '').split(/[/?#]/)[0] || '';
        const src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain);
        return `<span class="title-cell"><img class="favicon" src="${src}" alt=""> <span class="title-text">${(title || '(no title)')}</span></span>`;
    }

    // normalize URL for duplicate detection (remove fragment)
    function normalizeUrlForDup(url) {
        if (!url) return url;
        const idx = url.indexOf('#');
        return idx >= 0 ? url.slice(0, idx) : url;
    }

    // Render saved links rows (actions first, title consolidated)
    function renderRows(items) {
        linksTableBody.innerHTML = '';
        if (!items || items.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        emptyState.classList.add('hidden');

        items.forEach(function (it) {
            const tr = document.createElement('tr');

            // actions (first)
            const tdActions = document.createElement('td');
            const removeBtn = document.createElement('button');
            removeBtn.className = 'action-btn';
            removeBtn.title = 'Remove saved link';
            removeBtn.setAttribute('aria-label', 'Remove saved link');
            removeBtn.textContent = 'x';
            removeBtn.addEventListener('click', function () {
                const removeSuccess = function () {
                    loadAndRender();
                    updateSavedCount();
                };
                const removeFailed = function (url) {
                    console.warn('Remove failed:', url);
                    loadAndRender();
                    updateSavedCount();
                };
                const removeURL = readLaterObject.removeURLHandler(removeSuccess, removeFailed);
                removeURL(it.key);
            });
            tdActions.appendChild(removeBtn);
            tr.appendChild(tdActions);

            // title consolidated with favicon
            const tdTitle = document.createElement('td');
            tdTitle.innerHTML = titleWithFavicon(it.title, it.key);
            tr.appendChild(tdTitle);

            // url (opens in new tab)
            const tdUrl = document.createElement('td');
            const a = document.createElement('a');
            a.href = it.key;
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = it.key;
            tdUrl.appendChild(a);
            tr.appendChild(tdUrl);

            // added
            const tdAdded = document.createElement('td');
            tdAdded.textContent = fmtDate(it.timestamp);
            tr.appendChild(tdAdded);


            linksTableBody.appendChild(tr);
        });
    }

    // Render open tabs rows (actions first, title consolidated)
    function renderTabsRows(tabs) {
        if (!tabsTableBody) return;
        // apply search filter
        const q = (searchTabsInput && searchTabsInput.value || '').trim().toLowerCase();
        let items = (tabs || []).slice();
        if (q) {
            items = items.filter(t => {
                const title = (t.title || '').toLowerCase();
                const url = (t.url || '').toLowerCase();
                const win = (t._windowName || '').toLowerCase();
                return title.indexOf(q) !== -1 || url.indexOf(q) !== -1 || win.indexOf(q) !== -1;
            });
        }

        // sort according to currentSort
        items.sort(function (a, b) {
            const col = currentSort.col;
            let va = '', vb = '';
            if (col === 'title') { va = (a.title || '').toLowerCase(); vb = (b.title || '').toLowerCase(); }
            else if (col === 'url') { va = (a.url || '').toLowerCase(); vb = (b.url || '').toLowerCase(); }
            else if (col === 'window') { va = (a._windowName || '').toLowerCase(); vb = (b._windowName || '').toLowerCase(); }
            if (va < vb) return currentSort.asc ? -1 : 1;
            if (va > vb) return currentSort.asc ? 1 : -1;
            return 0;
        });

        tabsTableBody.innerHTML = '';
        if (!items || items.length === 0) {
            tabsEmptyState.classList.remove('hidden');
            return;
        }
        tabsEmptyState.classList.add('hidden');

        items.forEach(function (tab) {
            const tr = document.createElement('tr');

            // actions (first) — Add / Exists and Close (X)
            const tdActions = document.createElement('td');

            // selection checkbox for moving tabs between windows
            const sel = document.createElement('input');
            sel.type = 'checkbox';
            sel.className = 'tab-select';
            sel.setAttribute('data-tabid', String(tab.id));
            // reflect current selection state
            try { sel.checked = selectedTabIds.has(tab.id); } catch (e) { /* ignore */ }
            sel.addEventListener('change', function () {
                const id = Number(this.getAttribute('data-tabid'));
                if (this.checked) selectedTabIds.add(id);
                else selectedTabIds.delete(id);
                updateMoveButtonState();
            });
            tdActions.appendChild(sel);

            const addBtn = document.createElement('button');
            addBtn.className = 'tab-action-btn';
            addBtn.title = 'Add tab to saved links';
            addBtn.setAttribute('aria-label', 'Add tab to saved links');
            addBtn.textContent = '+';
            // mark as Exists immediately if already saved
            (function markIfSaved(btn, tabUrl) {
                readLaterObject.getValidSyncItems(function (items) {
                    const normalized = normalizeUrlForDup(tabUrl);
                    const exists = (items || []).some(it => normalizeUrlForDup(it.key) === normalized);
                    if (exists) {
                        // btn.textContent = '+';
                        btn.disabled = true;
                    }
                });
            })(addBtn, tab.url);

            addBtn.addEventListener('click', function () {
                const urlItem = { url: tab.url, data: { title: tab.title, timestamp: Date.now() } };
                const onSuccess = function () {
                    // addBtn.textContent = 'Exists';
                    addBtn.disabled = true;
                    loadAndRender();
                    updateSavedCount();
                };
                const onExists = function () {
                    // addBtn.textContent = 'Exists';
                    addBtn.disabled = true;
                };
                const addHandler = readLaterObject.addURLHandler(onSuccess, onExists);
                addHandler(urlItem);
            });

            const closeBtn = document.createElement('button');
            closeBtn.className = 'action-btn';
            closeBtn.textContent = 'x';
            closeBtn.title = 'Close tab';
            closeBtn.addEventListener('click', function () {
                if (!chrome.tabs || !chrome.tabs.remove) return;
                chrome.tabs.remove(tab.id, function () {
                    // refresh list after close
                    loadOpenTabs();
                });
            });
            tdActions.appendChild(closeBtn);
            tdActions.appendChild(addBtn);

            tr.appendChild(tdActions);

            // title consolidated with favicon — clicking will focus the real tab
            const tdTitle = document.createElement('td');
            tdTitle.innerHTML = titleWithFavicon(tab.title, tab.url);
            tdTitle.style.cursor = 'pointer';
            tdTitle.addEventListener('click', function () {
                focusTab(tab.id, tab.windowId);
            });
            tr.appendChild(tdTitle);

            // url — clicking focuses the existing tab instead of opening a new one
            const tdUrl = document.createElement('td');
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = tab.url || '';
            a.addEventListener('click', function (e) {
                e.preventDefault();
                focusTab(tab.id, tab.windowId);
            });
            tdUrl.appendChild(a);
            tr.appendChild(tdUrl);

            // window name
            const tdWindow = document.createElement('td');
            const winLabel = `${tab._windowName || ('Window ' + tab.windowId)}` + (tab._focused ? ' (focused)' : '');
            tdWindow.textContent = winLabel;
            tr.appendChild(tdWindow);

            tabsTableBody.appendChild(tr);
        });
        // ensure move button state matches any pre-selections
        updateMoveButtonState();
    }

    // focus an existing tab (bring its window forward and activate the tab)
    function focusTab(tabId, windowId) {
        if (!chrome.windows || !chrome.tabs) return;
        chrome.windows.update(windowId, { focused: true }, function () {
            chrome.tabs.update(tabId, { active: true });
        });
    }

    // Query open tabs in all windows and annotate with focused state + window names (Window 1..N)
    function loadOpenTabs() {
        if (!chrome.windows || !chrome.windows.getAll) {
            renderTabsRows([]);
            if (totalTabsCount) totalTabsCount.textContent = 'Total: 0 tabs';
            return;
        }
        chrome.windows.getAll({ populate: true }, function (wins) {
            const winNames = {};
            (wins || []).forEach(function (w, idx) {
                winNames[w.id] = `Window ${idx + 1}`;
            });

            const tabs = [];
            (wins || []).forEach(function (w) {
                (w.tabs || []).forEach(function (t) {
                    if (!t || !t.url) return;
                    if (t.url.startsWith('chrome://') || t.url.startsWith('chrome-extension://')) return;
                    tabs.push(Object.assign({}, t, {
                        _focused: !!w.focused,
                        _windowName: winNames[w.id] || (`Window ${w.id}`)
                    }));
                });
            });

            currentTabs = tabs;
            if (totalTabsCount) totalTabsCount.textContent = `Total: ${tabs.length} tabs`;
            renderTabsRows(currentTabs);
            // populate moveTargetWindow with available windows
            if (moveTargetWindow) {
                moveTargetWindow.innerHTML = '';
                (wins || []).forEach(function (w, idx) {
                    const opt = document.createElement('option');
                    opt.value = String(w.id);
                    const focusedLabel = w && w.focused ? ' (focused)' : '';
                    opt.textContent = `Window ${idx + 1}` + focusedLabel;
                    moveTargetWindow.appendChild(opt);
                });
                updateMoveButtonState();
            }
        });
    }

    // Add all visible tabs (currentTabs)
    function addAllTabs() {
        if (!currentTabs || !currentTabs.length) return;
        currentTabs.forEach(function (tab) {
            const urlItem = { url: tab.url, data: { title: tab.title, timestamp: Date.now() } };
            const addHandler = readLaterObject.addURLHandler(function () { /* success -> ignore inline */ }, function () { /* exists */ });
            addHandler(urlItem);
        });
        // mark UI and refresh
        loadOpenTabs();
        loadAndRender();
        updateSavedCount();
    }

    // Drop duplicate tabs (close duplicates keeping first occurrence). Duplicates determined by URL without fragment.
    function dropDuplicates() {
        if (!currentTabs || !currentTabs.length) return;
        const seen = new Map();
        const toClose = [];
        currentTabs.forEach(tab => {
            const key = normalizeUrlForDup(tab.url);
            if (!seen.has(key)) seen.set(key, tab.id);
            else {
                // keep first, close this duplicate
                toClose.push(tab.id);
            }
        });
        if (!toClose.length) return;
        if (!chrome.tabs || !chrome.tabs.remove) return;
        chrome.tabs.remove(toClose, function () {
            // refresh after closing
            loadOpenTabs();
        });
    }

    // Move selected tabs to target window id
    function moveSelectedTabs() {
        if (!selectedTabIds.size) return;
        const targetId = moveTargetWindow ? Number(moveTargetWindow.value) : null;
        if (!targetId || !chrome.tabs || !chrome.tabs.move) return;
        const ids = Array.from(selectedTabIds);
        // move API can accept array of ids, but behavior differs; move them to end of target window
        chrome.tabs.move(ids, { windowId: targetId, index: -1 }, function () {
            // clear selection and reload
            selectedTabIds.clear();
            updateMoveButtonState();
            loadOpenTabs();
        });
    }

    // Load saved links, optionally filter by query, sort by timestamp desc and render
    function loadAndRender() {
        readLaterObject.getValidSyncItems(function (items) {
            // items: array of { key, title, timestamp } or similar shape used earlier.
            // allow searchInput to filter by title/url
            const q = (searchInput && searchInput.value || '').trim().toLowerCase();
            let rows = items || [];
            if (q) {
                rows = rows.filter(it => {
                    const title = (it.title || '').toLowerCase();
                    const url = (it.key || '').toLowerCase();
                    return title.indexOf(q) !== -1 || url.indexOf(q) !== -1;
                });
            }
            // sort by timestamp desc
            rows.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            renderRows(rows);
        });
    }

    // Download JSON of all items
    function downloadJSON() {
        readLaterObject.getValidSyncItems(function (items) {
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items, null, 2));
            const a = document.createElement('a');
            a.setAttribute('href', dataStr);
            a.setAttribute('download', 'ReadLater-data.json');
            document.body.appendChild(a);
            a.click();
            a.remove();
        });
    }

    // Update saved count display: x/MAX_BADGE_COUNT
    function updateSavedCount() {
        const countsFetcher = readLaterObject.getCountsHandler(function (count) {
            const max = (readLaterObject.getMaxButtonItems && readLaterObject.getMaxButtonItems()) || '...';
            if (savedCountEl) savedCountEl.textContent = `${count}/${max}`;
        });
        if (countsFetcher) countsFetcher();
    }

    // Permissions rendering already present elsewhere in file; assume renderPermissions() exists
    // CTA link opens people settings
    enableSyncLink.addEventListener('click', function (e) {
        e.preventDefault();
        try { chrome.tabs.create({ url: 'chrome://settings/people' }); }
        catch (err) { window.open('chrome://settings/people', '_blank'); }
    });

    // wire buttons/listeners
    if (clearSavedBtn) {
        clearSavedBtn.addEventListener('click', function () {
            const clearHandler = readLaterObject.clearAllHandler(function () {
                loadAndRender();
                loadOpenTabs();
                // refresh permissions if present
                if (typeof renderPermissions === 'function') renderPermissions();
                updateSavedCount();
            });
            clearHandler();
        });
    }

    if (searchInput) searchInput.addEventListener('input', loadAndRender);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadJSON);

    if (searchTabsInput) searchTabsInput.addEventListener('input', function () { renderTabsRows(currentTabs); });
    if (refreshTabsBtn) refreshTabsBtn.addEventListener('click', loadOpenTabs);
    if (addAllTabsBtn) addAllTabsBtn.addEventListener('click', addAllTabs);
    if (dropDuplicatesBtn) dropDuplicatesBtn.addEventListener('click', dropDuplicates);
    if (moveTabsBtn) moveTabsBtn.addEventListener('click', moveSelectedTabs);
    if (tabsPermissionBtn) tabsPermissionBtn.addEventListener('click', toggleTabsPermission);

    // Debounced UI reload for tab/window events (keeps tabsTable in sync)
    let _reloadTimer = null;
    function scheduleReloadTabs() {
        try { clearTimeout(_reloadTimer); } catch (e) { }
        _reloadTimer = setTimeout(function () { loadOpenTabs(); }, 150);
    }

    // helper to add/remove tab/window listeners (only active when permission granted)
    function addTabListeners() {
        try {
            if (chrome && chrome.tabs) {
                chrome.tabs.onCreated.addListener(scheduleReloadTabs);
                chrome.tabs.onRemoved.addListener(scheduleReloadTabs);
                chrome.tabs.onMoved.addListener(scheduleReloadTabs);
                chrome.tabs.onAttached.addListener(scheduleReloadTabs);
                chrome.tabs.onDetached.addListener(scheduleReloadTabs);
                chrome.tabs.onUpdated.addListener(scheduleReloadTabs);
                chrome.tabs.onActivated.addListener(scheduleReloadTabs);
            }
            if (chrome && chrome.windows) {
                chrome.windows.onCreated.addListener(scheduleReloadTabs);
                chrome.windows.onRemoved.addListener(scheduleReloadTabs);
                chrome.windows.onFocusChanged.addListener(scheduleReloadTabs);
            }
        } catch (e) { /* ignore if platform doesn't expose these */ }
    }

    function removeTabListeners() {
        try {
            if (chrome && chrome.tabs) {
                try { chrome.tabs.onCreated.removeListener(scheduleReloadTabs); } catch (e) { }
                try { chrome.tabs.onRemoved.removeListener(scheduleReloadTabs); } catch (e) { }
                try { chrome.tabs.onMoved.removeListener(scheduleReloadTabs); } catch (e) { }
                try { chrome.tabs.onAttached.removeListener(scheduleReloadTabs); } catch (e) { }
                try { chrome.tabs.onDetached.removeListener(scheduleReloadTabs); } catch (e) { }
                try { chrome.tabs.onUpdated.removeListener(scheduleReloadTabs); } catch (e) { }
                try { chrome.tabs.onActivated.removeListener(scheduleReloadTabs); } catch (e) { }
            }
            if (chrome && chrome.windows) {
                try { chrome.windows.onCreated.removeListener(scheduleReloadTabs); } catch (e) { }
                try { chrome.windows.onRemoved.removeListener(scheduleReloadTabs); } catch (e) { }
                try { chrome.windows.onFocusChanged.removeListener(scheduleReloadTabs); } catch (e) { }
            }
        } catch (e) { /* ignore cleanup errors */ }
    }

    // Clean up listeners when the page unloads to avoid duplicates on reload
    window.addEventListener('unload', function () {
        removeTabListeners();
        try { clearTimeout(_reloadTimer); } catch (e) { }
    });

    // UI enable/disable when permission changes
    function setTabsUIEnabled(enabled) {
        // enable/disable controls that require tabs/windows permission
        try {
            if (moveTargetWindow) moveTargetWindow.disabled = !enabled;
            if (moveTabsBtn) moveTabsBtn.disabled = !enabled || selectedTabIds.size === 0;
            if (refreshTabsBtn) refreshTabsBtn.disabled = !enabled;
            if (addAllTabsBtn) addAllTabsBtn.disabled = !enabled;
            if (dropDuplicatesBtn) dropDuplicatesBtn.disabled = !enabled;
            if (searchTabsInput) searchTabsInput.disabled = !enabled;
        } catch (e) { }
    }

    // Check current permission state and update the UI
    function updatePermissionUI() {
        if (!tabsPermissionBtn || !chrome.permissions || !chrome.permissions.contains) return;
        chrome.permissions.contains({ permissions: ['tabs', 'windows'] }, function (granted) {
            if (granted) {
                tabsPermissionBtn.textContent = 'Revoke Tab Access';
                tabsPermissionBtn.classList.add('enabled');
                setTabsUIEnabled(true);
                addTabListeners();
                loadOpenTabs();
            } else {
                tabsPermissionBtn.textContent = 'Grant Tab Access';
                setTabsUIEnabled(false);
                // clear UI state
                renderTabsRows([]);
                if (moveTargetWindow) moveTargetWindow.innerHTML = '';
                removeTabListeners();
            }
            // refresh permissions list in options section
            refreshPermissionsList();
        });
    }

    // Request or remove tabs/windows permission interactively
    function toggleTabsPermission() {
        if (!chrome.permissions || !tabsPermissionBtn) return;
        chrome.permissions.contains({ permissions: ['tabs', 'windows'] }, function (granted) {
            if (granted) {
                // remove permission
                chrome.permissions.remove({ permissions: ['tabs', 'windows'] }, function (removed) {
                    // update UI regardless
                    updatePermissionUI();
                });
            } else {
                // request permission
                chrome.permissions.request({ permissions: ['tabs', 'windows'] }, function (grantedNow) {
                    updatePermissionUI();
                });
            }
        });
    }

    // populate #permList with current permissions (declared + optional granted)
    function refreshPermissionsList() {
        if (!permListEl || !chrome.permissions || !chrome.permissions.getAll) return;
        chrome.permissions.getAll(function (perms) {
            permListEl.innerHTML = '';
            // perms.permissions is an array of permission names
            const declared = (perms && perms.permissions) || [];
            if (!declared.length) {
                const li = document.createElement('li'); li.textContent = '(no permissions granted)'; permListEl.appendChild(li); return;
            }
            declared.forEach(p => {
                const li = document.createElement('li');
                li.textContent = p;
                permListEl.appendChild(li);
            });
        });
    }

    // keep perm list up-to-date when permissions change
    try {
        if (chrome && chrome.permissions && chrome.permissions.onAdded) {
            chrome.permissions.onAdded.addListener(refreshPermissionsList);
            chrome.permissions.onRemoved.addListener(refreshPermissionsList);
        }
    } catch (e) { /* ignore */ }

    // Listen to storage changes to keep the table in sync
    chrome.storage.onChanged.addListener(function () {
        loadAndRender();
        loadOpenTabs();
        updateSavedCount();
    });

    // sorting header clicks
    function setupTabsSorting() {
        const headers = document.querySelectorAll('#tabsTable thead th.sortable');
        headers.forEach(h => {
            h.addEventListener('click', function () {
                const col = h.getAttribute('data-col');
                if (currentSort.col === col) currentSort.asc = !currentSort.asc;
                else { currentSort.col = col; currentSort.asc = true; }
                document.querySelectorAll('#tabsTable thead th .sort-indicator').forEach(si => si.textContent = '');
                const ind = h.querySelector('.sort-indicator');
                if (ind) ind.textContent = currentSort.asc ? '▲' : '▼';
                renderTabsRows(currentTabs);
            });
        });
    }

    setupTabsSorting();

    // initial load
    document.addEventListener('DOMContentLoaded', function () {
        updateSavedCount();
        if (typeof renderPermissions === 'function') renderPermissions();
        loadAndRender();
        // check permission and initialize tabs UI accordingly
        updatePermissionUI();
    });

})();
