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
  let newUrls = [];
  // countRegex[0] == episode counter
  // countRegex[1] == season counter (optional)
  let countRegex = [];
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
      countRegex.push(/(?<=^(.*?\/){6})\d+/);
      // season counter
      countRegex.push(/(?<=^(.*?\/){5})\d+(?=\/.*)/);
      break;
    case 'lhtranslation':
      countRegex.push(/(?<=^(.*?\/){3}(.*?-)*)\d*(?=\.html)/);
      break;
    case 'mangasushi':
      countRegex.push(/(?<=^(.*?\/){5}chapter-)\d*(?=\/.*)/);
      break;
    case 'watch-series':
    case 'swatchseries':
      // counter episode
      countRegex.push(/(?<=^(.*?\/){4}(.*\_)*e)\d*(?=\.html)/);
      // counter season
      countRegex.push(/(?<=^(.*?\/){4}(.*\_)*s).\d*(?=\_e.*\.html)/);
      break;
    case 'yesmovies':
      // counter episode
      countRegex.push(/(?<=^(.*?\/){5})\d*(?=-.*)/);
      // counter season
      countRegex.push(/(?<=^(.*?\/){4}.*season-)\d*(?=-.*)/);
      break;
    default:
      // todo what do when website is not known?
      console.log('The website ' + host + ' is not yet known.');
      getNextUrlCountError += 1;
      return newUrls;
      break;
  }
  // episode count
  let episodeCount = countRegex[0].exec(bookmark.url)[0];
  // episode +1
  newUrls.push(bookmark.url.replace(countRegex[0], parseInt(episodeCount) + 1));
  getNextUrlCount += 1;

  // season Count
  if (countRegex[1] != undefined) {
    let seasonCount = countRegex[1].exec(bookmark.url)[0];
    // set episode to 1
    let seasonUrl = bookmark.url.replace(countRegex[0], 1);
    // season +1
    newUrls.push(seasonUrl.replace(countRegex[1], parseInt(seasonCount) + 1));
  }

  return newUrls;
}

async function checkNewEpisode(newUrls) {
  $.each(newUrls, (idx, newUrl) => {
    let xhr = new XMLHttpRequest();
    // xhr.open('HEAD', newUrl, true);
    // todo only use get method for the sides wich need extra check, is content is empty or not (lhtranslation)
    xhr.open('GET', newUrl, true);

    xhr.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        // some pages redirect if url doesn't exist
        // only check if parts after host match, in case the hosting-domain changed
        if (
          /(?<=^(.*?\/){3}).*/.exec(this.responseURL)[0] == /(?<=^(.*?\/){3}).*/.exec(newUrl)[0]
        ) {
          // some pages are blank so a content check is needed
          if ($(this.response).children().length > 1) {
            checkEpisodeCountNew += 1;
            // console.log(
            //   '+++++++++++++ page exits new:' + newUrl + ' resoponse: ' + this.responseURL
            // );
            browser.runtime.sendMessage({
              newEpisode: newUrl,
            });
          } else {
            checkEpisodeCount += 1;
            // console.log('------------- page not exits new:' + newUrl + ' resoponse: page is empty');
          }
        } else {
          checkEpisodeCount += 1;
          // console.log(
          //   '------------- page not exits new:' + newUrl + ' resoponse: ' + this.responseURL
          // );
        }
        // if status = 4xx client-error or 5xx server-error
      } else if (this.readyState == 4 && (/4\d\d/.test(this.status) || /5\d\d/.test(this.status))) {
        checkEpisodeCount += 1;
        // console.log('------------- page not exits new:' + newUrl + ' resoponse: ' + this.status);
      }
      browser.runtime.sendMessage({
        checkEpisodeCountNew: checkEpisodeCountNew,
        checkEpisodeCount: checkEpisodeCount,
      });
    };

    xhr.send();
  });
}
