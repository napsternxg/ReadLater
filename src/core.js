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

var readLater = (function(storageObject){

  var storage = storageObject;

  var badgeText = function(c) {
    if (c > 999) {
      return c.toString() + "+";
    }
    return c.toString();
  };

  var getCountsHandler = function(counts_callback){
    return function(){
      storage.get(function(items){
        var counts = 0;
        for(var key in items){
          if((typeof key === "string") && (key !== "count")){
            counts += 1;
          }
        }
        counts_callback(counts);
      });
    };
  };


  var createNewURLItemFromTab = function(tab){
      var urlData = { "title": tab.title, "timestamp": new Date().getTime() };
      var urlItem = {'url': tab.url, 'data': urlData};
      return urlItem;
  };

  var isValidSyncItem = function(syncItem){
    if (Object.keys(syncItem).length != 1){
      return false;
    }
    for (var key in syncItem){
      if (!("title" in syncItem[key]) || !("timestamp" in syncItem[key])){
        return false;
      }
    }
    return true;
  };

  return {
    storage: storage,
    getCountsHandler: getCountsHandler,

    setBadge: getCountsHandler(function(counts){
      chrome.browserAction.setBadgeText({
        "text": badgeText(counts)
      });
    }),

    addURLFromTabHandler: function(success_callback){
      return function(){
        chrome.tabs.query({ "active": true, "currentWindow": true }, function(
          tabs) {

          if (!tabs.length) // Sanity check in case no active tab was found
            return;
          var tab = tabs[0];

          var urlItem = createNewURLItemFromTab(tab);
          success_callback(urlItem);
        });
      };
    },

    addURLHandler:  function(success_callback, exists_callback){
      return function(urlItem){
        storage.get(urlItem.url, function(urlItemFound){
          if(isValidSyncItem(urlItemFound)){
            exists_callback(urlItem);
          } else {
            var syncItem = {};
            syncItem[urlItem.url] = urlItem.data;
            storage.set(syncItem, success_callback);
          }
        });
      };
    },

    removeURLHandler: function(success_callback, failed_callback){
      return function(url){
        storage.get(url, function(urlItemFound){
          if(urlItemFound){
            storage.remove(url, success_callback);
          } else {
            failed_callback(url);
          }
        });
      };
    },

    clearAllHandler: function(success_callback){
      return function(){
        var confirmVal = confirm("Are you sure you want to delete all links?");
        if(confirmVal === true){
          storage.clear(success_callback);
        }
      };
    },
  };
  
});

