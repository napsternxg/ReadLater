chrome.runtime.onStartup.addListener(setBadge);
chrome.runtime.onInstalled.addListener(setBadge);
chrome.storage.onChanged.addListener(setBadge);

function setBadge() {
  chrome.storage.sync.get({count: 0}, function({count}) {
    chrome.browserAction.setBadgeText({"text": badgeText(count)});
  });
}

function badgeText(c) {
	if(c > 999){
		return c.toString()+"+";
	}
	return c.toString();
}