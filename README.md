ReadLater
=========

[ADD TO CHROME](https://chrome.google.com/webstore/detail/read-later/nplngmgdacdfncdkpdomipkehfnbinfa)
------------------------------------------------------------------------------------------------------

![Version 2.0.1 Screenshot](http://napsternxg.github.io/ReadLater/images/Screenshot_2_0_1.JPG)


Change Log:
-----------

### 5.0.0
- Added an "Open Tabs" section to the options page that lists tabs from all windows.
- Features: search/filter, sortable columns (Title, URL, Window), per-tab "Add" button, "Add All Tabs" and "Refresh Tabs".
- Window names are derived from each window's active tab title for easier identification.
- UI/Files affected: src/tab.html, src/tab.js, src/tab.css.
- Removed persistent identity permission from the manifest; identity is now requested on-demand (via runtime request) or surfaced as a CTA to open Chrome People/Sync settings.
- Added a Permissions panel to the options page showing declared and granted permissions with short descriptions.
- Added background service worker (background.js) to handle the keyboard command for adding the current page.
- Changed suggested keyboard shortcut to Ctrl+Shift+Y (and platform equivalents) to avoid conflicts; remind users they can reassign under chrome://extensions/shortcuts.
- Manifest now includes the "tabs" permission required for the new Open Tabs UI.
- UI/Files affected: src/manifest.json, src/tab.html, src/tab.js, src/tab.css, src/background.js.
- Fixed a small syntax bug in download JSON generation (missing parenthesis) that prevented the options script from executing.
- Minor UX tweaks: "Clear saved links" button wired to the existing clear handler and the saved/tabs lists refresh after clearing.
- Files: src/tab.js, src/core.js, src/tab.html.

### 4.03
* Support for backward compatibility with URLs saved before 2.0.1

### 4.0.2
* Fix breaking change in UI about checking valid syncItems. 

### 4.0.1
* New API for maitaining the core storage management code with support from [Alexander Kashev](https://github.com/kav2k).
* Background process to listen to adding new URL's using keyboard shortcuts.
* Cleaner frontend UI using the core api with support from [Alexander Kashev](https://github.com/kav2k)
* Export URL's as JSON data.

### 3.0.1
* Added badge for the icon to show the link count.

### 2.0.1
* New Slick UI thanks to [Johny Jose](https://github.com/atrniv)
* Icons and Shorter titles for links thanks to [FrelEsquif](https://github.com/FrelEsquif)
* Sort links by adding date thanks to [FrelEsquif](https://github.com/FrelEsquif)

### 1.0.1
* Support adding more than 31 links, max limit 512
* Duplicate links not allowed
* Data structure for saving links changed. Each link is saved as key value pair in the sync storage as opposed to the earlier version where all links were stored in an array.
* UI bug regarding Message box changed.  

## Notes
- After manifest/service-worker changes reload the extension (chrome://extensions → Reload).
- If the keyboard shortcut does not trigger, check chrome://extensions/shortcuts and reassign as needed.

(For a full history see the repository commits.)


Installation Instructions for downloading from source:
-------------------------------------------------------

 1. Download the extension zip file from: [https://github.com/downloads/napsternxg/ReadLater/ReadLater.zip](https://github.com/downloads/napsternxg/ReadLater/ReadLater.zip)
 2. Unzip the extension to a folder **ReadLater** anywhere on your computer. 
 3. Put your Google Chrome in Developer Mode. Go to Tools > Extensions. Click on the Check Box on Top Right which says Developer Mode.
 4. Now click on Load Unpacked Extension ...
 5. Select the folder where you unzipped the ReadLater.zip file. 
 6. You will see a small icon on your chrome, top right. 
 7. Click on it, to see if the popup is coming.
 8. If it is working, yippiee..ki...yay, start adding links and reading more online =)

See source code at: [https://github.com/napsternxg/ReadLater](https://github.com/napsternxg/ReadLater)
