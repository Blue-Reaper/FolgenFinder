// Put all the javascript code here, that you want to execute in background.

// debug popup
// browser.tabs.create({ url: 'browserAction/popup.html' });
// debug sidebar
// browser.tabs.create({ url: 'sidebar/sidebar.html' });

//idea set folder name in settings and only default is "FolgenFinder"
let titleRootFolder = 'FolgenFinder';

// Listen for messages from other scripts
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.reload != undefined && request.reload == 'start') {
    checkBookmarks();
  }
});

// till "add bookmark", "update bookmark" or some other funktion is added,
// toggle sidebar with browser-action and don't show popup
browser.browserAction.onClicked.addListener(() => {
  browser.sidebarAction.toggle();
  checkBookmarks();
});

checkRootFolder();

// Onboarding and Upboarding
browser.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
  if (temporary) return; // skip during development
  switch (reason) {
    case 'install':
      {
        // const url = browser.runtime.getURL('views/installed.html');
        // await browser.tabs.create({ url });
        // or: await browser.windows.create({ url, type: "popup", height: 600, width: 600, });

        // FIXME not called by install?
        checkRootFolder();
      }
      break;
    case 'update':
      {
        // const url = browser.runtime.getURL("views/updated.html");
        // await browser.tabs.create({ url });
        // or: await browser.windows.create({ url, type: "popup", height: 600, width: 600, });

        console.log('update');
      }
      break;
  }
});

function checkBookmarks() {
  return Promise.resolve()
    .then(() => checkRootFolder())
    .then((rootId) => getBookmarksFromRootFolder(rootId))
    .then((bookmarkItems) => {
      if (bookmarkItems == undefined || bookmarkItems.length == 0) {
        // no existiting bookmarks
        return Promise.resolve();
      }
      // console.log('bookmark count: ' + bookmarkItems.length);
      $.each(bookmarkItems, (idx, bookmark) =>
        checkNewEpisode(getUrlNextEpisode(bookmark))
      );
      browser.runtime.sendMessage({
        reload: 'end',
      });
    })
    .catch((err) => {
      if (err) {
        console.error(err);
      }
      return Promise.resolve();
    });
}

function checkRootFolder() {
  return Promise.resolve()
    .then(() => browser.bookmarks.search({ title: titleRootFolder }))
    .then((rootFolder) => {
      if (rootFolder.length == 0) {
        // console.log('Default folder not found.');
        // create default folder if not exists
        return Promise.resolve()
          .then(function () {
            return browser.bookmarks.create({
              title: titleRootFolder,
            });
          })
          .then(function (rootFolder) {
            return rootFolder.id;
          });
      } else if (rootFolder.length > 1) {
        //   ToDo add error handling
        console.error(
          'More than one folder "' + rootFolder[0].title + '" found.'
        );
      } else {
        return rootFolder[0].id;
      }
    })
    .catch((err) => {
      if (err) {
        console.error(err);
      }
      return Promise.resolve();
    });
}

function getBookmarksFromRootFolder(rootId) {
  return Promise.resolve()
    .then(() => {
      // console.log('rootId: ' + rootId);
      return Promise.resolve().then(() => browser.bookmarks.getSubTree(rootId));
    })
    .then((rootTree) => {
      // rootTree[0] == rootFolder
      return Promise.resolve(rootTree[0].children);
    })
    .catch((err) => {
      if (err) {
        console.error(err);
      }
      return Promise.resolve();
    });
}

function getUrlNextEpisode(bookmark) {
  let urlParts = bookmark.url.split('/');
  // console.log('urlSplit: ' + urlParts);
  // console.log('urlDomain: ' + urlParts[2]);

  // counter to next episode
  switch (urlParts[2]) {
    case 'reaperscans.com':
    case 'edelgardescans.com':
    case 'leviatanscans.com':
    case 'skscans.com':
      urlParts[6] = parseInt(urlParts[6]) + 1;
      break;
    case 'lhtranslation.net':
      // split name
      let parts = urlParts[3].split('-');
      // split further
      let lastPart = parts[parts.length - 1].split('.');
      // count +1
      lastPart[0] = parseInt(lastPart[0]) + 1;
      //join erverithing together
      parts[parts.length - 1] = lastPart.join('.');
      urlParts[3] = parts.join('-');
      // todo the next pages do exist but are empty
      // clear array to not get false positiv "new episodes"
      urlParts = [];
      break;
    default:
      // todo what do when website is not known?
      // clear array to not get false positiv "new episodes"
      urlParts = [];
      console.log('The website ' + urlParts[2] + ' is yet not known.');
      break;
  }

  let newUrl = urlParts.join('/');
  // console.log('new url: ' + newUrl);
  return newUrl;
}

async function checkNewEpisode(newUrl) {
  // var xhr;
  // var _orgAjax = jQuery.ajaxSettings.xhr;
  // jQuery.ajaxSettings.xhr = function () {
  //   xhr = _orgAjax();
  //   return xhr;
  // };
  // $.ajax({
  //   method: 'HEAD',
  //   url: newUrl,
  //   success: function () {
  //     console.log('newUrl: ' + this.url);
  //     console.log('response location: ' + xhr.responseURL);
  //     // some pages redirect if url doesn't exist
  //     if (xhr.responseURL == this.url) {
  //       console.log('page exits ' + this.url);
  //       listNewEpisodes.push(this.url);
  //     } else {
  //       console.log('page not exits ' + this.url);
  //     }
  //   },
  //   error: function () {
  //     console.log('page not exits ' + this.url);
  //   },
  // });

  let xhr = new XMLHttpRequest();
  xhr.open('HEAD', newUrl, true);

  xhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      console.log('new: ' + newUrl);
      console.log('response: ' + xhr.responseURL);
      // some pages redirect if url doesn't exist
      if (xhr.responseURL == newUrl) {
        console.log('+++++++++++++ page exits ' + newUrl);
        browser.runtime.sendMessage({
          newEpisode: newUrl,
        });
      } else {
        console.log('------------- page not exits ' + newUrl);
      }
    }
  };

  xhr.send();
}
