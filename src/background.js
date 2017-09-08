/**

ReadLater, a Google Chrome extension which enables a user to save the links for later reading.
These links are automatically synced across all the chrome browsers on which the user is logged in.

The extension uses local storage of the user for storing links.

Author: Shubhanshu Mishra
Source Code: https://github.com/napsternxg/ReadLater
Date Created: 28th September, 2012
LICENSE: GPL-2.0

*/

var readLaterObject = readLater(chrome.storage.sync);

var readLaterApp = (function(){
	var add_success = function(){
		console.log(`URL Item successfully added.`);
	};

	var add_exists = function(urlItem){
		var urlJSON = JSON.stringify(urlItem);
		console.log(`Add failed. URLItem ${urlJSON} already exists.`);
	};

	var remove_success = function(){
		console.log(`URL successfully removed.`);
	};

	var remove_failed = function(url){
		console.log(`Remove failed. URL ${url} does not exist.`);
	};

	var clear_all_success = function(){
		console.log("Cleared all URLs.");
	};

	var addURL = readLaterObject.addURLHandler(add_success, add_exists);
	return {
		removeURL: readLaterObject.removeURLHandler(remove_success, remove_failed),
		clearAll: readLaterObject.clearAllHandler(clear_all_success),
		addURLFromTab: readLaterObject.addURLFromTabHandler(addURL)
	}
})();


chrome.commands.onCommand.addListener(function(command) {
  console.log('Command:', command);
  if (command === "add-url") {
    console.log("Adding URL");
    readLaterApp.addURLFromTab();
  }
});

chrome.runtime.onStartup.addListener(readLaterObject.setBadge);
chrome.runtime.onInstalled.addListener(readLaterObject.setBadge);
chrome.storage.onChanged.addListener(readLaterObject.setBadge);
