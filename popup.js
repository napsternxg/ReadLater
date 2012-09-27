/**

ReadLater 1.0, a Google Chrome extension which enables a user to save the links for later reading.
These links are automatically synced across all the chrome browsers on which the user is logged in.

The extension uses local storage of the user for storing links.

Author: Shubhanshu Mishra
Source Code: http://github.com/napsternxg/
Version: 1.0
Date Created: 28th September, 2012
Last Modified: 28th September, 2012


*/

/**
Create variables for the DOM elements.
*/
var addBtn = document.getElementById("addBtn");
var clearBtn = document.getElementById("clearBtn");
var msg = document.getElementById("message");
var links = document.getElementById("links");


/**
Setup variables for accessing and modifying the chrome sync storage.
*/
var storage = chrome.storage.sync;
var linkList = [];
var count = 0;

/**
Populate the extension with the list of currently stored links.
Initialize the link counter.
*/
storage.get("links", function(items){
  if(items.links){
    linkList = items.links;
    count = linkList.length; // Initialize the link counter
    message("Loading");
    for (var i = 0; i < count; i++) {
      /**
      Create list items and append them to the current list.
      */
      var list = document.createElement("li");
      list.innerHTML="<a href="+linkList[i].url+">"+linkList[i].title+"</a>";
      links.appendChild(list);
    };
  }  
});

/**
Click Event Listener for the Add button.
1. Gets the title and url of the currently selected tab.
2. Appends these values as a single object in the links item in the sync storage.
3. Increment link counter.
4. Updated the current list to show the newly added link item.
*/

addBtn.addEventListener("click", function(){
  /**
    Access the currently selected tab of chrome browser.
  */
  chrome.tabs.getSelected(null, function(tab){
    /**
      Create list items and append them to the current list.
    */
    var list = document.createElement("li");
    list.innerHTML = "<a href="+tab.url+">"+tab.title+"</a>";
    /**
      Append the current tab details to the sync storage list and update the sync storage.
    */
    linkList.push({"title": tab.title, "url": tab.url});

    storage.set({"links": linkList}, function(){
      count++;
      message("Saved!!!");
      links.appendChild(list);
    });
  });
});


/**
Click Event Listener for the Clear button.
1. Clears the local storage.
2. Re-initialize the link counter to 0.
3. Clear the current list.
*/
clearBtn.addEventListener("click", function(){
  storage.remove("links", function(){
      count = 0;
      message("Cleared!!!");
    });
  links.innerHTML = "";
});

/**
Display the message given in messageStr in the message div.
*/

function message(messageStr) {
  msg.innerText = messageStr;
  setTimeout(function() {
    msg.innerText = "Total Links:"+count;
  }, 3000);
}

/**
Log to show that the extension is loaded.
*/
console.log("Extension ReadLater Loaded");