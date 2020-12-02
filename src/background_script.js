// Put all the javascript code here, that you want to execute in background.

let titleRootFolder = '';

readOptions();
browser.storage.onChanged.addListener(readOptions);
function readOptions() {
  let gettingActiveFolder = browser.storage.sync.get('activeFolder');
  gettingActiveFolder.then((res) => {
    titleRootFolder = res.activeFolder;
    // console.log('read options - folder: ' + res.activeFolder);
  });
}

// Listen for messages from other scripts
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // fixme background gets multible "reload=true" messages, but only 1 was sent
  if (request.reload != undefined && request.reload == 'start') {
    readOptions();
    checkBookmarks();
  }
});

// till "add bookmark", "update bookmark" or some other funktion is added,
// toggle sidebar with browser-action and don't show popup
browser.browserAction.onClicked.addListener(() => {
  browser.sidebarAction.toggle();
});

// checkRootFolder();

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

let bookmarkCount = 0;
let loopCount = 0;
let getNextUrlCount = 0;
let getNextUrlCountError = 0;
let checkEpisodeCountNew = 0;
let checkEpisodeCount = 0;

function checkBookmarks() {
  return Promise.resolve()
    .then(() => checkRootFolder())
    .then((rootId) => getBookmarksFromRootFolder(rootId))
    .then((bookmarkItems) => {
      if (bookmarkItems == undefined || bookmarkItems.length == 0) {
        // no existiting bookmarks
        return Promise.resolve();
      }
      bookmarkCount = bookmarkItems.length;
      loopCount = 0;
      getNextUrlCount = 0;
      getNextUrlCountError = 0;
      checkEpisodeCountNew = 0;
      checkEpisodeCount = 0;
      $.each(bookmarkItems, (idx, bookmark) => {
        loopCount += 1;
        checkNewEpisode(getUrlNextEpisode(bookmark));
      });
      browser.runtime.sendMessage({
        reload: 'end',
        bookmarkCount: bookmarkCount,
        loopCount: loopCount,
        getNextUrlCount: getNextUrlCount,
        getNextUrlCountError: getNextUrlCountError,
      });
    });
}

function checkRootFolder() {
  return Promise.resolve()
    .then(() => browser.bookmarks.search({ title: titleRootFolder }))
    .then((rootFolder) => {
      if (rootFolder.length == 0) {
        // console.log('Default folder not found.');
        // todo folder should exists, create folder in options after asking user
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
        console.error('More than one folder "' + rootFolder[0].title + '" found.');
      } else {
        return rootFolder[0].id;
      }
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
    });
}

function getUrlNextEpisode(bookmark) {
  let countRegex;
  // (?<=^(.*:\/\/) -> http:// or https://
  // (.+\.)*) -> www. or any sub-domain
  // [^\.]* -> host (ensures not to get any sub-domains)
  // (?=\..{1,3}\/) (top-level-domain and everything after it)
  let host = /(?<=^(.*:\/\/)(.+\.)*)[^\.]*(?=\..{1,3}\/)/.exec(bookmark.url)[0];
  // find episode-count for host
  switch (host) {
    case 'reaperscans':
    // regex with named group see: https://github.com/tc39/proposal-regexp-named-groups
    // let regex = /(?<=^(.*?\/){6})(?<count>\d+)/;
    case 'edelgardescans':
    case 'leviatanscans':
    case 'skscans':
      // regex to find episode
      countRegex = /(?<=^(.*?\/){6})\d+/;
      break;
    case 'lhtranslation':
      // todo the next pages do exist but are empty
      countRegex = /(?<=^(.*?\/){3}(.*?-)*)\d*(?=\.html)/;
      getNextUrlCountError += 1;
      return 'unknownDomain';
      break;
    case 'mangasushi':
      // todo one false "new episode"
      countRegex = /(?<=^(.*?\/){5}chapter-)\d*(?=\/.*)/;
      getNextUrlCountError += 1;
      return 'unknownHost';
      break;
    default:
      // todo what do when website is not known?
      console.log('The website ' + host + ' is yet not known.');
      getNextUrlCountError += 1;
      return 'unknownHost';
      break;
  }

  // console.log('original URL:' + bookmark.url);
  let count = countRegex.exec(bookmark.url)[0];
  // console.log('Count: ' + count);

  let newUrl = bookmark.url.replace(countRegex, parseInt(count) + 1);
  // console.log('new url: ' + newUrl);
  getNextUrlCount += 1;
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
      // console.log('new: ' + newUrl);
      // console.log('response: ' + xhr.responseURL);
      // some pages redirect if url doesn't exist
      if (xhr.responseURL == newUrl) {
        checkEpisodeCountNew += 1;
        // console.log('+++++++++++++ page exits new:' + newUrl + ' resoponse: ' + xhr.responseURL);
        browser.runtime.sendMessage({
          newEpisode: newUrl,
        });
      } else {
        checkEpisodeCount += 1;
        // console.log(
        //   '------------- page not exits new:' + newUrl + ' resoponse: ' + xhr.responseURL
        // );
      }
    } else if (this.readyState == 4 && this.status == 404) {
      checkEpisodeCount += 1;
      // console.log('------------- page not exits new:' + newUrl + ' resoponse: 404');
    }
    browser.runtime.sendMessage({
      checkEpisodeCountNew: checkEpisodeCountNew,
      checkEpisodeCount: checkEpisodeCount,
    });
  };

  xhr.send();
}
