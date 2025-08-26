/*
  Tab page script for listing/searching/removing saved links.
  Depends on core.js which provides readLater(storage).
*/

(function () {
    const readLaterObject = readLater(chrome.storage.sync);

    const searchInput = document.getElementById('searchInput');
    const linksTableBody = document.querySelector('#linksTable tbody');
    const emptyState = document.getElementById('emptyState');
    const refreshBtn = document.getElementById('refreshBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const enableSyncLink = document.getElementById('enableSyncLink');
    const maxItemsSpan = document.getElementById('maxItems');

    // Open tabs elements
    const tabsTableBody = document.querySelector('#tabsTable tbody');
    const refreshTabsBtn = document.getElementById('refreshTabsBtn');
    const addAllTabsBtn = document.getElementById('addAllTabsBtn');
    const tabsEmptyState = document.getElementById('tabsEmptyState');
    const searchTabsInput = document.getElementById('searchTabsInput');

    // New button for clearing saved links
    const clearSavedBtn = document.getElementById('clearSavedBtn');

    if (clearSavedBtn) {
        clearSavedBtn.addEventListener('click', function () {
            // clearAllHandler returns a function that prompts and clears storage
            const clearHandler = readLaterObject.clearAllHandler(function () {
                // refresh saved links and tabs after clearing
                loadAndRender();
                loadOpenTabs();
                renderPermissions();
            });
            clearHandler();
        });
    }

    // in-memory tabs and sort state
    let currentTabs = [];
    let currentSort = { col: 'title', asc: true };

    // Utility: format timestamp
    function fmtDate(ts) {
        try {
            const d = new Date(ts);
            return d.toLocaleString();
        } catch (e) {
            return String(ts);
        }
    }

    // Utility: favicon HTML for a URL
    function faviconImg(url) {
        const domain = url.replace(/^https?:\/\//i, '').split(/[/?#]/)[0];
        const src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain);
        return `<img class="favicon" src="${src}" alt="">`;
    }

    // Render rows given items array
    function renderRows(items) {
        linksTableBody.innerHTML = '';
        if (!items || items.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        emptyState.classList.add('hidden');

        items.forEach(function (it) {
            const tr = document.createElement('tr');

            // favicon
            const tdFav = document.createElement('td');
            tdFav.innerHTML = faviconImg(it.key);
            tr.appendChild(tdFav);

            // title
            const tdTitle = document.createElement('td');
            const titleText = document.createElement('div');
            titleText.textContent = it.title || '(no title)';
            tdTitle.appendChild(titleText);
            tr.appendChild(tdTitle);

            // url
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

            // actions
            const tdActions = document.createElement('td');
            const removeBtn = document.createElement('button');
            removeBtn.className = 'action-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', function () {
                // call remove handler from core
                const removeSuccess = function () {
                    // re-render after removal
                    loadAndRender();
                };
                const removeFailed = function (url) {
                    console.warn('Remove failed:', url);
                    loadAndRender();
                };
                const removeURL = readLaterObject.removeURLHandler(removeSuccess, removeFailed);
                removeURL(it.key);
            });
            tdActions.appendChild(removeBtn);
            tr.appendChild(tdActions);

            linksTableBody.appendChild(tr);
        });
    }

    // Render open tabs rows
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

            // favicon
            const tdFav = document.createElement('td');
            const domain = (tab.url || '').replace(/^https?:\/\//i, '').split(/[/?#]/)[0] || '';
            const src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain);
            tdFav.innerHTML = `<img class="favicon" src="${src}" alt="">`;
            tr.appendChild(tdFav);

            // title
            const tdTitle = document.createElement('td');
            tdTitle.textContent = tab.title || '(no title)';
            tr.appendChild(tdTitle);

            // url
            const tdUrl = document.createElement('td');
            const a = document.createElement('a');
            a.href = tab.url || '';
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = tab.url || '';
            tdUrl.appendChild(a);
            tr.appendChild(tdUrl);

            // window column
            const tdWindow = document.createElement('td');
            const winLabel = `${tab._windowName || ('Window ' + tab.windowId)}` + (tab._focused ? ' (focused)' : '');
            tdWindow.textContent = winLabel;
            tr.appendChild(tdWindow);

            // actions
            const tdActions = document.createElement('td');
            const addBtn = document.createElement('button');
            addBtn.className = 'tab-action-btn';
            addBtn.textContent = 'Add';
            addBtn.addEventListener('click', function () {
                // create same shape as core.addURLHandler expects
                const urlItem = { url: tab.url, data: { title: tab.title, timestamp: new Date().getTime() } };
                const onSuccess = function () {
                    addBtn.textContent = 'Added';
                    addBtn.disabled = true;
                    // refresh list of saved links
                    loadAndRender();
                };
                const onExists = function () {
                    addBtn.textContent = 'Exists';
                    addBtn.disabled = true;
                };
                const addHandler = readLaterObject.addURLHandler(onSuccess, onExists);
                addHandler(urlItem);
            });
            tdActions.appendChild(addBtn);
            tr.appendChild(tdActions);

            tabsTableBody.appendChild(tr);
        });
    }

    // Query open tabs in all windows and annotate with focused state per window
    function loadOpenTabs() {
        if (!chrome.windows || !chrome.windows.getAll) {
            renderTabsRows([]);
            return;
        }
        // Get all windows populated with their tabs, derive a friendly window name
        chrome.windows.getAll({ populate: true }, function (wins) {
            const winNames = {};
            // derive name per window: prefer active tab title, fallback to "Window N"
            (wins || []).forEach(function (w, idx) {
                let name = `Window ${idx + 1}`;
                if (w.tabs && w.tabs.length) {
                    const active = w.tabs.find(t => t.active) || w.tabs[0];
                    if (active && active.title) {
                        name = active.title;
                    }
                }
                winNames[w.id] = name;
            });

            // collect all tabs from all windows and attach window name + focused flag
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
            renderTabsRows(currentTabs);
        });
    }

    // Add all visible tabs
    function addAllTabs() {
        if (!chrome.tabs || !chrome.tabs.query) return;
        chrome.tabs.query({ currentWindow: true }, function (tabs) {
            const usable = (tabs || []).filter(t => t && t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'));
            usable.forEach(function (tab) {
                const urlItem = { url: tab.url, data: { title: tab.title, timestamp: new Date().getTime() } };
                const addHandler = readLaterObject.addURLHandler(function () { /* no-op */ }, function () { /* exists */ });
                addHandler(urlItem);
            });
            // refresh both lists
            loadOpenTabs();
            loadAndRender();
        });
    }

    // Load items, optionally filter by query, sort by timestamp desc and render
    function loadAndRender() {
        readLaterObject.getValidSyncItems(function (items) {
            // sort newest first
            items.sort(function (a, b) {
                return b.timestamp - a.timestamp;
            });

            const q = (searchInput.value || '').trim().toLowerCase();
            const filtered = q
                ? items.filter(function (it) {
                    const title = (it.title || '').toLowerCase();
                    const url = (it.key || '').toLowerCase();
                    return title.indexOf(q) !== -1 || url.indexOf(q) !== -1;
                })
                : items;

            renderRows(filtered);
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

    // Update options meta info: only show max badge count. CTA is a static link.
    function updateOptionsMeta() {
        try {
            const max = readLaterObject.getMaxButtonItems && readLaterObject.getMaxButtonItems();
            maxItemsSpan.textContent = (typeof max !== 'undefined') ? String(max) : 'n/a';
        } catch (e) {
            maxItemsSpan.textContent = 'n/a';
        }
    }

    // Render human-friendly permission list and current granted state
    function renderPermissions() {
        const manifest = chrome.runtime.getManifest();
        const declared = manifest.permissions || [];
        const hostDeclared = manifest.host_permissions || manifest.host_permissions || [];

        // friendly descriptions for common permissions (extend as needed)
        const permDescriptions = {
            'storage': 'Access chrome.storage to save and sync links across browsers.',
            'activeTab': 'Temporary access to the active tab when user invokes the extension (e.g. Add current page).',
            'identity': 'Access basic profile information (email) for the signed-in Chrome account.',
            'tabs': 'Access tab information (URLs, titles) when granted.',
            'alarms': 'Schedule periodic tasks using the alarms API.',
            'notifications': 'Show system notifications.',
        };

        function permItemHtml(name, desc, granted, type) {
            const s = granted ? 'granted' : 'not-granted';
            return `<li class="perm-item ${s}"><strong>${name}</strong> <span class="perm-type">[${type}]</span>
                        <div class="perm-desc">${desc}</div>
                        <div class="perm-status">${granted ? 'Granted' : 'Not granted'}</div>
                    </li>`;
        }

        // First get runtime-granted permissions
        chrome.permissions.getAll(function (granted) {
            const grantedSet = new Set((granted.permissions || []).concat(granted.origins || []));
            const listEl = document.getElementById('permList');
            if (!listEl) return;
            listEl.innerHTML = '';

            // render declared simple permissions
            declared.forEach(function (p) {
                const desc = permDescriptions[p] || 'No detailed description available.';
                const isGranted = grantedSet.has(p);
                listEl.insertAdjacentHTML('beforeend', permItemHtml(p, desc, isGranted, 'permission'));
            });

            // render host permissions (origins)
            hostDeclared.forEach(function (h) {
                const desc = `Access to host: ${h} (used for favicons or fetching resources on matching pages).`;
                const isGranted = grantedSet.has(h) || (grantedSet.has('<all_urls>') && h === '<all_urls>');
                listEl.insertAdjacentHTML('beforeend', permItemHtml(h, desc, isGranted, 'host'));
            });

            // If no declared permissions, show a helpful message
            if (declared.length === 0 && hostDeclared.length === 0) {
                listEl.innerHTML = '<li class="perm-item">No permissions declared in manifest.</li>';
            }
        });
    }

    // CTA link: open Chrome People / Sync settings to allow sign-in & enable sync
    enableSyncLink.addEventListener('click', function (e) {
        e.preventDefault();
        try {
            chrome.tabs.create({ url: 'chrome://settings/people' });
        } catch (err) {
            window.open('chrome://settings/people', '_blank');
        }
    });

    // Event listeners
    searchInput.addEventListener('input', function () {
        loadAndRender();
    });

    if (searchTabsInput) {
        searchTabsInput.addEventListener('input', function () {
            renderTabsRows(currentTabs);
        });
    }

    // keep options meta updated on load and whenever storage changes
    document.addEventListener('DOMContentLoaded', function () {
        updateOptionsMeta();
        renderPermissions();
        loadAndRender();
        loadOpenTabs();
    });

    refreshBtn.addEventListener('click', function () {
        updateOptionsMeta();
        renderPermissions();
        loadAndRender();
        loadOpenTabs();
    });

    downloadBtn.addEventListener('click', downloadJSON);

    if (refreshTabsBtn) refreshTabsBtn.addEventListener('click', loadOpenTabs);
    if (addAllTabsBtn) addAllTabsBtn.addEventListener('click', addAllTabs);

    // Listen to storage changes to keep the table in sync
    chrome.storage.onChanged.addListener(function () {
        updateOptionsMeta();
        renderPermissions();
        loadAndRender();
        loadOpenTabs();
    });

    // sorting header clicks
    function setupTabsSorting() {
        const headers = document.querySelectorAll('#tabsTable thead th.sortable');
        headers.forEach(h => {
            h.addEventListener('click', function () {
                const col = h.getAttribute('data-col');
                if (currentSort.col === col) currentSort.asc = !currentSort.asc;
                else { currentSort.col = col; currentSort.asc = true; }
                // update indicators
                document.querySelectorAll('#tabsTable thead th .sort-indicator').forEach(si => si.textContent = '');
                const ind = h.querySelector('.sort-indicator');
                if (ind) ind.textContent = currentSort.asc ? '▲' : '▼';
                renderTabsRows(currentTabs);
            });
        });
    }

    setupTabsSorting();

    // Initial load handled above (updateOptionsMeta + loadAndRender + loadOpenTabs)
})();
