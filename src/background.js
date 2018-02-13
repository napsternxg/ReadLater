/**

ReadLater, a Google Chrome extension which enables a user to save the links for later reading.
These links are automatically synced across all the chrome browsers on which the user is logged in.

The extension uses local storage of the user for storing links.

Author: Shubhanshu Mishra
Source Code: https://github.com/napsternxg/ReadLater
Date Created: 28th September, 2012
LICENSE: GPL-2.0

*/

const NOTIFICATION_AUTOHIDE_DELAY = 700;

var readLaterObject = readLater(chrome.storage.sync);

var readLaterApp = (function() {

	function displayNotification(id, title, message) {
		chrome.notifications.create(id, {
			type: "basic",
			title: title,
			message: message,
			iconUrl: "icon.png"
		}, function(id) {
			setTimeout(function() {
				chrome.notifications.clear(id);
			}, NOTIFICATION_AUTOHIDE_DELAY);
		});
	}

	var remove_success = function(removedItem) {
		displayNotification('RemovedFromBackground', "Page Removed", removedItem.title);		
		console.log(`URL successfully removed.`);
	};

	var remove_failed = function(url){
		console.log(`Remove failed. URL ${url} does not exist.`);
	};
	
	let removeUrlHandler = readLaterObject.removeURLHandler(remove_success, remove_failed)

	var add_success = function(addedItem) {
		displayNotification('AddedFromBackground', "Page Added", addedItem.data.title);		
		console.log(`URL Item successfully added.`);
	};

	var add_exists = function(urlItem) {
		// Tried to add but it exists --- then remove
		console.log("The current page is already present -- trying to remove...")
		removeUrlHandler(urlItem.url);
	};

	var clear_all_success = function(){
		console.log("Cleared all URLs.");
	};

	var toggleURLHandler = readLaterObject.toggleURLHandler(add_success, add_exists);
	return {
		removeURL: removeUrlHandler,
		clearAll: readLaterObject.clearAllHandler(clear_all_success),
		toggleURLFromTab: readLaterObject.toggleURLFromTabHandler(toggleURLHandler)
	}
})();


chrome.commands.onCommand.addListener(function(command) {
  console.log('Command:', command);
  if (command === "toggle-url") {
    console.log("Adding URL");
    readLaterApp.toggleURLFromTab();
  }
});

chrome.runtime.onStartup.addListener(readLaterObject.setBadge);
chrome.runtime.onInstalled.addListener(readLaterObject.setBadge);
chrome.storage.onChanged.addListener(readLaterObject.setBadge);
