/**

ReadLater 1.0, a Google Chrome extension which enables a user to save the links for later reading.
These links are automatically synced across all the chrome browsers on which the user is logged in.

The extension uses local storage of the user for storing links.

Author: Shubhanshu Mishra
Source Code: https://github.com/napsternxg/ReadLater
Version: 3.0.1
Date Created: 28th September, 2012
Last Modified: 10th December, 2014


*/
/**
Create variables for the DOM elements.
*/
var addBtn = document.getElementById("addBtn");
var clearBtn = document.getElementById("clearBtn");
var msg = document.getElementById("message");
var links = document.getElementById("links");

readLater.setup(msg, links, true);

readLater.init();
chrome.storage.onChanged.addListener(readLater.init);

addBtn.addEventListener("click", addURL);
clearBtn.addEventListener("click", clearAll);

/**
Log to show that the extension is loaded.
*/
console.log("Extension ReadLater Loaded");