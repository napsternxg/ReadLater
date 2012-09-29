/**

ReadLater 1.0, a Google Chrome extension which enables a user to save the links for later reading.
These links are automatically synced across all the chrome browsers on which the user is logged in.

The extension uses local storage of the user for storing links.

Author: Shubhanshu Mishra
Source Code: https://github.com/napsternxg/ReadLater
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
Create the HTML to be stored inside each list item for every link
*/
function createLinkHTML(listItem){
  var linkBtn = document.createElement("input");
  linkBtn.setAttribute("class", "removeBtn");
  linkBtn.setAttribute("value", "X");
  var returnHTML = linkBtn.outerHTML+"<a target='_blank' href='"+listItem.url+"'>"+listItem.title+"</a>";

  return returnHTML;
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
  console.log("Removing link: "+linkId.getAttribute("class"));
  var parentNode = linkId.parentNode.parentNode; //Get the <ul> list dom element for the current list item
  if(parentNode){
    var i = getChildNumber(linkId.parentNode); //Get the id of the <li> item in the given parentNode
    linkList.splice(i, 1); //Remove the corresponding list entry for the current list item from the linkList array
    /**
    Update the sync storage with the newly updated linkList array
    */
    var key = "link-"+i;

    storage.remove(key, function(){
      count --; // Reduce Count
      message("Removed Link!!!");
    });
    /**
    Remove the list item dom element from the UI
    */
    parentNode.removeChild(linkId.parentNode);
    console.log("Removed Child!!!")
  }  
}

/**
Store everything as individual items in sync storage.
MAX LENGTH = 512
MAX SPACE IN BYTES = 102, 400
*/
storage.get(function(items){
  message("Loading");
  count = 0;
  console.log("Count: "+count);
  for (key in items) {
    console.log('Storage key "%s" equals "%s".',
              key,
              syncItem);
    var syncItem = items[key];
    linkList.push(syncItem);
    var list = document.createElement("li");
    list.innerHTML= createLinkHTML(syncItem);
    links.appendChild(list);
    //Attach event listeners to the newly created link for the remove button click
    
    list.getElementsByClassName("removeBtn")[0].addEventListener("click", removeLink, false);
    count++;
  }
  message("Finished!!!");
});
/**
Populate the extension with the list of currently stored links.
Initialize the link counter.
*/
/**
storage.get("links", function(items){
  if(items.links){
    linkList = items.links;
    count = linkList.length; // Initialize the link counter
    message("Loading");
    for (var i = 0; i < count; i++) {
      
      //Create list items and append them to the current list.
      
      var list = document.createElement("li");
      list.innerHTML= createLinkHTML(linkList[i]);
      links.appendChild(list);
      //Attach event listeners to the newly created link for the remove button click
      
      list.getElementsByClassName("removeBtn")[0].addEventListener("click", removeLink, false);
    };
  }  
});
*/


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
    var newLink = {"title": tab.title, "url": tab.url};
    list.innerHTML = createLinkHTML(newLink);
    /**
      Append the current tab details to the sync storage list and update the sync storage.
    */
    linkList.push(newLink);

    /**
    Update the sync storage with the list of links containing the newly added link
    */
    var item = {};
    item["link-"+count] = newLink;
    storage.set(item, function(){
      count++;
      message("Saved!!!");
      links.appendChild(list);
      /**
      Attach event listeners to the newly created link for the remove button click
      */
      list.getElementsByClassName("removeBtn")[0].addEventListener("click", removeLink, false);
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
    linkList = [];
    storage.clear(function(){
      count = 0;
      message("Cleared!!!");
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
    console.log('Storage key "%s" in namespace "%s" changed. ' +
                'Old value was "%s", new value is "%s".',
                key,
                namespace,
                storageChange.oldValue,
                storageChange.newValue);
  }
});