(function() {

  window.readLater = window.readLater || {};

  /**
    Functionality needed:
    - Setup UI
    - Add URL
    - Remove URL
    - Clear all URLs
    - Count URLs
    - Update UI
    - Listen to changes in sync storage
  **/

  readLater.setup = function(msg, links, is_popup, message){
    readLater.msg = msg;
    readLater.links = links;
    readLater.is_popup = is_popup;
    readLater.storage = chrome.storage.sync;
    readLater.message = message;

  };

  readLater.createNewURLItem = function(tab){
    var urlData = { "title": tab.title, "timestamp": new Date().getTime() };
    var urlItem = {'url': tab.url, 'data': urlData};
    return urlItem;
  };

  readLater.addURLToStorage = function(callback){
    return function(urlItem){
      readLater.storage.get(urlItem.url, function(items){
        /**
          Add link only if it is not already present in storage
        **/
        if(!Object.keys(items).length){
          var item = {};
          item[urlItem.url] = urlItem.data;
          readLater.storage.set(item, callback);
        } else {
          readLater.message("URL exists.");
        }
      });

    }; 
  };

  readLater.addURL = function(callback){
    // Access the active tab
    chrome.tabs.query({ "active": true, "currentWindow": true }, function(
      tabs) {

      if (!tabs.length) // Sanity check in case no active tab was found
        return;
      var tab = tabs[0];

      var urlItem = readLater.createNewURLItem(tab);
      readLater.addURLToStorage(callback)()

    });
  };

  readLater.removeURLFromStorage = function(callback){
    return function(url){
      readLater.storage.remove(url, function(){
        if(typeof callback == "function"){
          callback();
        }
      });

    }; 
  };

  readLater.clearAll = function(callback) {
    var confirmVal = confirm("Are you sure you want to delete all links ?");
    if (confirmVal == true) {
      readLater.storage.clear(function() {
        callback();
      });
    }
  };



})();