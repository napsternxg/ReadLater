readLater.setup(null, null, false);

chrome.runtime.onStartup.addListener(readLater.setBadge);
chrome.runtime.onInstalled.addListener(readLater.setBadge);
chrome.storage.onChanged.addListener(readLater.setBadge);

chrome.commands.onCommand.addListener(function(command) {
  console.log('Command:', command);
  if (command === "add-url") {
    console.log("Adding URL");
    readLater.addURL();
  }
});