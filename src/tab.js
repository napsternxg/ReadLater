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
    const userProfileSpan = document.getElementById('userProfile');
    const enableSyncBtn = document.getElementById('enableSyncBtn');
    const maxItemsSpan = document.getElementById('maxItems');

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

    // Update options meta info: signed-in user and max badge count.
    // Identity access is granted on demand; show CTA if permission not present.
    function updateOptionsMeta() {
        // MAX_BUTTON_ITEMS from core.js
        try {
            const max = readLaterObject.getMaxButtonItems && readLaterObject.getMaxButtonItems();
            maxItemsSpan.textContent = (typeof max !== 'undefined') ? String(max) : 'n/a';
        } catch (e) {
            maxItemsSpan.textContent = 'n/a';
        }

        function showNotSignedIn() {
            userProfileSpan.textContent = 'Not signed in';
            enableSyncBtn.classList.remove('hidden');
        }

        function deriveAndShow(infoEmail) {
            const local = infoEmail.split('@')[0].replace(/[._]/g, ' ');
            const name = local.split(' ').map(s => s ? (s[0].toUpperCase() + s.slice(1)) : '').join(' ');
            userProfileSpan.textContent = `${name} (${infoEmail})`;
            enableSyncBtn.classList.add('hidden');
        }

        function fetchProfileInfo() {
            if (!chrome.identity) {
                userProfileSpan.textContent = 'Unavailable';
                enableSyncBtn.classList.remove('hidden');
                return;
            }
            if (chrome.identity.getProfileUserInfo) {
                chrome.identity.getProfileUserInfo(function (info) {
                    if (info && info.email) {
                        deriveAndShow(info.email);
                        return;
                    }
                    if (chrome.identity.getAccounts) {
                        chrome.identity.getAccounts(function (accounts) {
                            const acc = (accounts && accounts.length) ? (accounts.find(a => a && a.email) || accounts[0]) : null;
                            if (acc && acc.email) {
                                deriveAndShow(acc.email);
                                return;
                            }
                            showNotSignedIn();
                        });
                    } else {
                        showNotSignedIn();
                    }
                });
            } else if (chrome.identity.getAccounts) {
                chrome.identity.getAccounts(function (accounts) {
                    const acc = (accounts && accounts.length) ? (accounts.find(a => a && a.email) || accounts[0]) : null;
                    if (acc && acc.email) {
                        deriveAndShow(acc.email);
                        return;
                    }
                    showNotSignedIn();
                });
            } else {
                userProfileSpan.textContent = 'Unavailable';
                enableSyncBtn.classList.remove('hidden');
            }
        }

        // Check whether identity permission has been granted at runtime.
        if (chrome.permissions && chrome.permissions.contains) {
            chrome.permissions.contains({ permissions: ['identity'] }, function (has) {
                if (has) {
                    fetchProfileInfo();
                } else {
                    showNotSignedIn();
                }
            });
        } else {
            // No permissions API available — attempt to fetch directly (may fail)
            fetchProfileInfo();
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

    // CTA: request identity permission on demand; if declined open People settings as fallback.
    enableSyncBtn.addEventListener('click', function () {
        if (chrome.permissions && chrome.permissions.request) {
            chrome.permissions.request({ permissions: ['identity'] }, function (granted) {
                if (granted) {
                    // permission granted — fetch and show profile
                    if (typeof updateOptionsMeta === 'function') {
                        // re-run meta update which will detect the granted permission and fetch profile
                        updateOptionsMeta();
                    }
                } else {
                    // user declined; open People settings as a fallback option
                    try {
                        chrome.tabs.create({ url: 'chrome://settings/people' });
                    } catch (e) {
                        window.open('chrome://settings/people', '_blank');
                    }
                }
            });
        } else {
            // No runtime permissions API — open settings as fallback
            try {
                chrome.tabs.create({ url: 'chrome://settings/people' });
            } catch (e) {
                window.open('chrome://settings/people', '_blank');
            }
        }
    });

    // Event listeners
    searchInput.addEventListener('input', function () {
        loadAndRender();
    });

    // keep options meta updated on load and whenever storage changes
    document.addEventListener('DOMContentLoaded', function () {
        updateOptionsMeta();
        renderPermissions();
        loadAndRender();
    });

    refreshBtn.addEventListener('click', function () {
        updateOptionsMeta();
        renderPermissions();
        loadAndRender();
    });

    downloadBtn.addEventListener('click', downloadJSON);

    // Listen to storage changes to keep the table in sync
    chrome.storage.onChanged.addListener(function () {
        updateOptionsMeta();
        renderPermissions();
        loadAndRender();
    });

    // Initial load handled above (updateOptionsMeta + loadAndRender)
})();
