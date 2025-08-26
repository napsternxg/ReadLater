/**

ReadLater, a Google Chrome extension which enables a user to save the links for later reading.
These links are automatically synced across all the chrome browsers on which the user is logged in.

The extension uses local storage of the user for storing links.

Author: Shubhanshu Mishra
Source Code: https://github.com/napsternxg/ReadLater
Date Created: 28th September, 2012
LICENSE: GPL-2.0

*/

// Import shared helper into the service worker context
importScripts('core.js');

var readLaterObject = readLater(chrome.storage.sync);

var readLaterApp = (function () {
	var add_success = function () {
		console.log(`URL Item successfully added.`);
	};

	var add_exists = function (urlItem) {
		var urlJSON = JSON.stringify(urlItem);
		console.log(`Add failed. URLItem ${urlJSON} already exists.`);
	};

	var remove_success = function () {
		console.log(`URL successfully removed.`);
	};

	var remove_failed = function (url) {
		console.log(`Remove failed. URL ${url} does not exist.`);
	};

	var clear_all_success = function () {
		console.log("Cleared all URLs.");
	};

	var addURL = readLaterObject.addURLHandler(add_success, add_exists);
	return {
		removeURL: readLaterObject.removeURLHandler(remove_success, remove_failed),
		clearAll: readLaterObject.clearAllHandler(clear_all_success),
		addURLFromTab: readLaterObject.addURLFromTabHandler(addURL)
	}
})();


// Listen for keyboard command "add-url" and save the active tab
chrome.commands && chrome.commands.onCommand.addListener(function (command) {
	if (command === 'add-url') {
		try {
			chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
				if (!tabs || !tabs.length) return;
				const tab = tabs[0];
				if (!tab || !tab.url) return;
				const urlItem = { url: tab.url, data: { title: tab.title || '', timestamp: Date.now() } };

				// uses existing addURLHandler (success_callback, exists_callback)
				const onSuccess = function () {
					// optional: update badge count via getCountsHandler if needed
					// readLaterObject.setBadge && readLaterObject.setBadge();
				};
				const onExists = function () {
					// no-op
				};
				const addHandler = readLaterObject.addURLHandler(onSuccess, onExists);
				addHandler(urlItem);
			});
		} catch (e) {
			console.warn('add-url command handler failed', e);
		}
	}
});

chrome.runtime.onStartup.addListener(readLaterObject.setBadge);
chrome.runtime.onInstalled.addListener(readLaterObject.setBadge);
chrome.storage.onChanged.addListener(readLaterObject.setBadge);
