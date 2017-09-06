(function() {

  window.readLater = window.readLater || {};

  /**
      Setup variables for accessing and modifying the chrome sync storage.
      */

  readLater.storage = chrome.storage.sync;
  readLater.count = 0;

  readLater.setup = function(msg, links, is_popup) {

    console.log("Setting up readLater");
    readLater.msg = msg;
    readLater.links = links;
    readLater.is_popup = is_popup;

  };

  readLater.useCounts = function(fn) {
    readLater.storage.get({ count: 0 }, function({ count }) {
      readLater.count = count;
      fn({ count });
    });
  };

  readLater.setBadge = function() {
    readLater.useCounts(function({ count }) {
      chrome.browserAction.setBadgeText({ "text": readLater.badgeText(
          count) });
    });
  };

  readLater.badgeText = function(c) {
    if (c > 999) {
      return c.toString() + "+";
    }
    return c.toString();
  };

  /**
  Create the HTML to be stored inside each list item for every link
  */
  readLater.createLinkHTML = function(listItem, url) {
    var linkBtn = document.createElement("span");
    linkBtn.setAttribute("class", "removeBtn");
    linkBtn.setAttribute("name", url);
    var returnHTML = linkBtn.outerHTML + "<a target='_blank' href='" + url +
      "'>" + readLater.getIcon(url) + " " + listItem.title + "</a>";

    return returnHTML;
  };

  readLater.getIcon = function(url) {
    var domain = url.replace('http://', '').replace('https://', '').split(
      /[/?#]/)[0];
    var imgUrl = "http://www.google.com/s2/favicons?domain=" + domain;

    var img = document.createElement("img");
    img.setAttribute('src', imgUrl);
    return img.outerHTML;
  };

  /**
  Display the message given in messageStr in the message div.
  */
  readLater.message = function(messageStr) {
    // Only update UI elements when running from popup.
    if (!readLater.is_popup) {
      console.log(messageStr);
      return;
    }
    readLater.msg.innerText = messageStr;
    setTimeout(function() {
      readLater.useCounts(function({ count }) {
        readLater.msg.innerText = "Total Links:" + count;
      });
    }, 1000);
  };

  /**
  Get the child number in its parentNode
  */
  function getChildNumber(node) {
    return Array.prototype.indexOf.call(node.parentNode.childNodes, node);
  }

  /**
  Event Function to be called when the user clicks on the remove icon
  */
  readLater.removeLink = function(e) {
    // body...
    var linkId = e.target; //Get the caller of the click event
    var linkDOMId = linkId.getAttribute("name"); //Get the key for the corresponding link
    //console.log("Removing link: "+ linkDOMId);
    var parentNode = linkId.parentNode.parentNode; //Get the <ul> list dom element for the current list item
    if (parentNode) {
      var i = getChildNumber(linkId.parentNode); //Get the id of the <li> item in the given parentNode

      /**
       Remove the link from the sync storage
       */
      var key = linkDOMId;
      readLater.storage.remove(key, function() {
        readLater.count--; // Reduce Count
        readLater.storage.set({ "count": readLater.count }); //Update count in the sync storage
        readLater.message("Removed Link");
        //console.log("Removed Link with key: "+key+"");
      });
      /**
      Remove the list item dom element from the UI
      */
      parentNode.removeChild(linkId.parentNode);
      //console.log("Removed Child");
    }
  };

  /**
  Click Event Listener for the Add button.
  1. Gets the title and url of the currently selected tab.
  2. Add the object containing the id, title for the key equal to the url of the tab.
  3. Increment link counter and update in sync storage
  4. Updated the current list to show the newly added link item.
  */

  readLater.addURL = function() {
    /**
      Access the currently selected tab of chrome browser.
      */
    chrome.tabs.query({ "active": true, "currentWindow": true }, function(
      tabs) {
      /**
        Create list items and append them to the current list.
        */
      if (!tabs.length) // Sanity check in case no active tab was found
        return;
      var tab = tabs[0];

      var newLink = { "title": tab.title, "timestamp": new Date().getTime() };
      if (newLink.title.length > 50)
        newLink.title = newLink.title.substr(0, 50) + "...";

      readLater.storage.get(tab.url, function(items) {
        //console.log(items);
        /**
          Add the link only if it is not present in the sync storage
          */
        if (!Object.keys(items).length) {
          if (readLater.is_popup) {
            var list = document.createElement("li");
            list.innerHTML = readLater.createLinkHTML(newLink, tab.url);
          }

          /**
          Update the sync storage with the list of links containing the newly added link
          */
          var item = {};
          item[tab.url] = newLink;
          item["count"] = readLater.count + 1; //increment count in the storage
          readLater.storage.set(item, function() {
            readLater.count++;
            readLater.message("Saved!");
            readLater.links.appendChild(list);
            /**
            Attach event listeners to the newly created link for the remove button click
            */
            if (readLater.is_popup) {
              list.getElementsByClassName("removeBtn")[0].addEventListener(
                "click", removeLink, false);
            }
          });
        }
        /**
          If the storage already contains the item, display message "Already Exists"
          */
        else {
          readLater.message("Link Exists");
        }
      });
    });
  };

  /**
  Store everything as individual items in sync storage.
  MAX LENGTH = 512
  MAX SPACE IN BYTES = 102, 400
  */

  /**
  Populate the extension with the list of currently stored links.
  Initialize the link counter.
  */

  readLater.init = function() {
    readLater.storage.get(function(items) {
      readLater.links.innerHTML = ""; // Clear links if called in an update

      readLater.message("Loading");
      readLater.count = 0;
      console.log("Count: " + readLater.count);

      var syncItems = new Array();

      for (key in items) {
        if (key == "count") {
          readLater.count = items[key]; // check for count key, and if present get its value
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

      syncItems.sort(function(a, b) {
        if (a.timestamp < b.timestamp) return -1;
        if (a.timestamp > b.timestamp) return 1;
        return 0;
      });
      //console.log('Element was sorted by timestamp');

      for (var i = 0; i < count; i++) {
        var list = document.createElement("li");
        list.innerHTML = readLater.createLinkHTML(syncItems[i],
          syncItems[i].key);
        readLater.links.appendChild(list);
        //Attach event listeners to the newly created link for the remove button click

        list.getElementsByClassName("removeBtn")[0].addEventListener(
          "click", readLater.removeLink, false);
      }
      readLater.message("Finished!");
    });
  };

  /**
  Click Event Listener for the Clear button.
  1. Clears the local storage.
  2. Re-initialize the link counter to 0.
  3. Clear the current list.
  */

  readLater.clearAll = function() {
    var confirmVal = confirm("Are you sure you want to delete all links ?");
    if (confirmVal == true) {
      readLater.storage.clear(function() {
        readLater.count = 0;
        readLater.message("Cleared!");
      });
      readLater.links.innerHTML = "";
    }
  };

})();