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


/**
Setup variables for accessing and modifying the chrome sync storage.
*/
var storage = chrome.storage.sync;
//var linkList = [];
var count = 0;


/**
Create the HTML to be stored inside each list item for every link
*/
function createLinkHTML(listItem, url){
  var linkBtn = document.createElement("span");
  linkBtn.setAttribute("class", "removeBtn");
  linkBtn.setAttribute("name", url);
  var returnHTML = linkBtn.outerHTML+"<a target='_blank' href='"+url+"'>" + getIcon(url) + " " + listItem.title +"</a>";

  return returnHTML;
}

function getIcon(url){
  var domain = url.replace('http://','').replace('https://','').split(/[/?#]/)[0];
  var imgUrl = "http://www.google.com/s2/favicons?domain=" + domain;

  var img = document.createElement("img");
  img.setAttribute('src', imgUrl);
  return img.outerHTML;
}


/**
Get the child number in its parentNode
*/
function getChildNumber(node) {
  return Array.prototype.indexOf.call(node.parentNode.childNodes, node);
}


/**
Event Function to be called when the user clicks on the remove icon
*/
function removeLink(e) {
  // body...
  var linkId = e.target; //Get the caller of the click event
  var linkDOMId = linkId.getAttribute("name"); //Get the key for the corresponding link
  //console.log("Removing link: "+ linkDOMId);
  var parentNode = linkId.parentNode.parentNode; //Get the <ul> list dom element for the current list item
  if(parentNode){
    var i = getChildNumber(linkId.parentNode); //Get the id of the <li> item in the given parentNode

    /**
     Remove the link from the sync storage
    */
    var key = linkDOMId;
    storage.remove(key, function(){
      count--; // Reduce Count
      storage.set({"count": count}); //Update count in the sync storage
      message("Removed Link");
      //console.log("Removed Link with key: "+key+"");
	  chrome.browserAction.setBadgeText({"text": badgeText(count)});
    });
    /**
    Remove the list item dom element from the UI
    */
    parentNode.removeChild(linkId.parentNode);
    //console.log("Removed Child");
  }  
}

function badgeText(c){
	if(c > 999){
		return c.toString()+"+";
	}
	return c.toString();
}

/**
Store everything as individual items in sync storage.
MAX LENGTH = 512
MAX SPACE IN BYTES = 102, 400
*/

/**
Populate the extension with the list of currently stored links.
Initialize the link counter.
*/
storage.get(function(items){
  message("Loading");
  count = 0;
  console.log("Count: "+count);

  var syncItems = new Array();

  for (key in items) {
    if(key == "count"){
      count = items[key]; // check for count key, and if present get its value
      continue;
    }
    var syncItem = items[key]; // get one item from sync storage
    syncItem.key = key;
    /*console.log('Storage key "%s" equals {"%s"}.',
          key,
          syncItem.title
          );
    console.log('Check key value in syncItem: "%s" - timestamp: %d',
          syncItem.key,
          syncItem.timestamp
	);*/
    if (syncItem.title.length > 50)
      syncItem.title = syncItem.title.substr(0, 50) + "...";

    syncItems.push(syncItem);
  }

  syncItems.sort(function(a, b){
    if(a.timestamp < b.timestamp) return -1;
    if(a.timestamp > b.timestamp) return 1;
    return 0;
  });
  //console.log('Element was sorted by timestamp');

  for (var i = 0; i < count; i++) {
    var list = document.createElement("li");
    list.innerHTML= createLinkHTML(syncItems[i], syncItems[i].key);
    links.appendChild(list);
    //Attach event listeners to the newly created link for the remove button click
    
    list.getElementsByClassName("removeBtn")[0].addEventListener("click", removeLink, false);
  }
  message("Finished!");
  chrome.browserAction.setBadgeText({"text": badgeText(count)});
});

/**
Click Event Listener for the Add button.
1. Gets the title and url of the currently selected tab.
2. Add the object containing the id, title for the key equal to the url of the tab.
3. Increment link counter and update in sync storage
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
    var newLink = {"title": tab.title, "timestamp": new Date().getTime()};
    if (newLink.title.length > 50)
      newLink.title = newLink.title.substr(0, 50) + "...";

    storage.get(tab.url, function(items){
      //console.log(items);
      /**
        Add the link only if it is not present in the sync storage
      */
      if(!Object.keys(items).length){

        var list = document.createElement("li");
        list.innerHTML = createLinkHTML(newLink, tab.url);

        /**
        Update the sync storage with the list of links containing the newly added link
        */
        var item = {};
        item[tab.url] = newLink;
        item["count"] = count+1; //increment count in the storage
        storage.set(item, function(){
          count++;
          message("Saved!");
          links.appendChild(list);
          /**
          Attach event listeners to the newly created link for the remove button click
          */
          list.getElementsByClassName("removeBtn")[0].addEventListener("click", removeLink, false);
		  chrome.browserAction.setBadgeText({"text": badgeText(count)});
        });
      }
      /**
        If the storage already contains the item, display message "Already Exists"
      */
      else{
        message("Link Exists");
      }
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
  var confirmVal = confirm("Are you sure you want to delete all links ?");
  if(confirmVal == true){
    storage.clear(function(){
      count = 0;
      message("Cleared!");
	  chrome.browserAction.setBadgeText({"text": badgeText(count)});
    });
    links.innerHTML = "";
  }

});

/**
Display the message given in messageStr in the message div.
*/
function message(messageStr) {
  msg.innerText = messageStr;
  setTimeout(function() {
    msg.innerText = "Total Links:"+count;
  }, 1000);
}

/**
Log to show that the extension is loaded.
*/
console.log("Extension ReadLater Loaded");

/**
Creat a console log everytime the sync storage is changed.
*/
chrome.storage.onChanged.addListener(function(changes, namespace) {
  for (key in changes) {
    var storageChange = changes[key];
	/*
    console.log('Storage key "%s" in namespace "%s" changed. ' +
                'Old value was "%s", new value is "%s".',
                key,
                namespace,
                storageChange.oldValue,
                storageChange.newValue);
				*/
  }
});
