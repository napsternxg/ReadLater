/**

ReadLater, a Google Chrome extension which enables a user to save the links for later reading.
These links are automatically synced across all the chrome browsers on which the user is logged in.

The extension uses local storage of the user for storing links.

Author: Shubhanshu Mishra
Source Code: https://github.com/napsternxg/ReadLater
Date Created: 28th September, 2012
LICENSE: GPL-2.0

*/
/**
Create variables for the DOM elements.
*/
var readLaterObject = readLater(chrome.storage.sync);

var readLaterApp = (function(readLaterObject){
  var addBtn = document.getElementById("addBtn");
  var clearBtn = document.getElementById("clearBtn");
  var msg = document.getElementById("message");
  var links = document.getElementById("links");
  var downloadBtn = document.getElementById("downloadAsJSON");
  var downloadContainer = document.getElementById('downloadContainer');

  var downloadAsJSON = function(){
    readLaterObject.getValidSyncItems(function(syncItems){
      console.log("Downloading items");
      var downloadDataLink = document.createElement("a");
      var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(syncItems, 0, 2));
      downloadDataLink.setAttribute("style", "display: none");
      downloadDataLink.setAttribute("href", dataStr);
      downloadDataLink.setAttribute("download", "ReadLater-data.json");
      
      downloadContainer.appendChild(downloadDataLink);
      downloadDataLink.click();
      downloadDataLink.remove();
    });
  };

  var getTitle = function(title){
    if (title.length > 50){
      title = title.substr(0, 50) + "...";
    }
    return title;
  };

  var show_total_links = readLaterObject.getCountsHandler(function(counts){
    msg.innerText = `Total Links:${counts}`;
  });

  var message = function(messageStr) {
    msg.innerText = messageStr;
    setTimeout(show_total_links, 1000);
  };

  var add_success = function(){
    console.log(`URL Item successfully added.`);
    init();
  };

  var add_exists = function(urlItem){
    console.log(`Add failed. URLItem ${urlItem} already exists.`);
    message("URL exists.");
  };

  var remove_success = function(){
    console.log(`URL successfully removed.`);
    init();
  };

  var remove_failed = function(url){
    console.log(`Remove failed. URL ${url} does not exist.`);
  };

  var clear_all_success = function(){
    console.log("Cleared all URLs.");
    init();
  };

  var addURL = readLaterObject.addURLHandler(add_success, add_exists);
  var removeURL = readLaterObject.removeURLHandler(remove_success, remove_failed);

  var removeAction = function(e){
    var linkId = e.target; //Get the caller of the click event
    var linkDOMId = linkId.getAttribute("name"); //Get the key for the corresponding link
    //console.log("Removing link: "+ linkDOMId);
    var parentNode = linkId.parentNode.parentNode; //Get the <ul> list dom element for the current list item
    if (parentNode) {
      /**
       Remove the link from the sync storage
       */
      var url = linkDOMId;
      /**
      Remove the list item dom element from the UI
      */
      parentNode.removeChild(linkId.parentNode);
      //console.log("Removed Child");
      removeURL(url);
    }
  };

  var clearAll = readLaterObject.clearAllHandler(clear_all_success);
  var addURLFromTab = readLaterObject.addURLFromTabHandler(addURL);

  addBtn.addEventListener("click", addURLFromTab);
  clearBtn.addEventListener("click", clearAll);
  downloadBtn.addEventListener("click", downloadAsJSON);

  var getIcon = function(url) {
    var domain = url.replace('http://', '').replace('https://', '').split(
      /[/?#]/)[0];
    var imgUrl = "http://www.google.com/s2/favicons?domain=" + domain;

    var img = document.createElement("img");
    img.setAttribute('src', imgUrl);
    return img.outerHTML;
  };

  var createLinkHTML = function(listItem, url) {
    var linkBtn = document.createElement("span");
    var itemDate = new Date(listItem.timestamp);
    var title = `${listItem.title}\nAdded on: ${itemDate}`;
    linkBtn.setAttribute("class", "removeBtn");
    linkBtn.setAttribute("name", url);
    var returnHTML = linkBtn.outerHTML + "<a target='_blank' href='" + url +
      "' title='"+title+"'>" + getIcon(url) + " " + getTitle(listItem.title) + "</a>";

    return returnHTML;
  };

  var init = function(){
    readLaterObject.getValidSyncItems(function(syncItems){
      links.innerHTML = "";
      var counts = syncItems.length;
      //console.log(syncItems);
      message(`Loaded ${counts} links.`);

      syncItems.sort(function(a, b) {
        if (a.timestamp < b.timestamp) return -1;
        if (a.timestamp > b.timestamp) return 1;
        return 0;
      });

      syncItems.forEach(function(syncItem){
        //console.log(syncItem);
        var listItem = document.createElement("li");
        listItem.innerHTML = createLinkHTML(syncItem, syncItem.key);
        links.appendChild(listItem);
        //Attach event listeners to the newly created link for the remove button click

        listItem.getElementsByClassName("removeBtn")[0].addEventListener(
          "click", removeAction, false);

      });
      message("Finished!");

    });

  };

  return {
    init: init
  };

})(readLaterObject);


readLaterApp.init();
chrome.storage.onChanged.addListener(readLaterApp.init);

/**
Log to show that the extension is loaded.
*/
console.log("Extension ReadLater Loaded");