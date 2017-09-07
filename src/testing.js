/**
Simple testing file
**/

var readLaterTest = (function(){
	var urlData = [];
	return {
		getData: function(callback){
			callback(urlData);
		},

		addURLHandler:  function(success_callback, failed_callback){
			return function(url){
				urlData.push(url);
				console.log(urlData);
				if (typeof url === "string"){
					success_callback(url);
				} else {
					failed_callback(url);
				}
			};
		},

		removeURLHandler: function(success_callback, failed_callback){
			return function(url){
				var idx = urlData.indexOf(url);
				if(idx > 0){
					urlData.splice(idx, 1);
					success_callback(url);
				} else {
					failed_callback(url);
				}
			}
		}
	};
	
})();



var readLaterApp = {};

var failed_callback = function(url){
	console.log(`Failed operation on ${url}`)
};

readLaterApp.addURL = readLaterTest.addURLHandler(function(url){
	console.log(`Url ${url} added successfully`);
}, failed_callback);

readLaterApp.removeURL = readLaterTest.removeURLHandler(function(url){
	console.log(`URL: ${url} removed successfully.`)
}, failed_callback);

readLaterApp.addURL("http://google.com");
readLaterApp.addURL("http://facebook.com");
readLaterApp.addURL("http://bing.com");
readLaterApp.addURL("http://twitter.com");
readLaterApp.addURL(1);

readLaterApp.removeURL("http://bing.com");
readLaterApp.removeURL("http://wsj.com");
