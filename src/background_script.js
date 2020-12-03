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
let checkEpisodeCountError = 0;
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
      checkEpisodeCountError = 0;
      checkEpisodeCount = 0;
      $.each(bookmarkItems, (idx, bookmark) => {
        loopCount += 1;
        getUrlNextEpisode(bookmark).then((newBookmark) => {
          checkNewEpisode(newBookmark);
          browser.runtime.sendMessage({
            reload: 'end',
            bookmarkCount: bookmarkCount,
            loopCount: loopCount,
            getNextUrlCount: getNextUrlCount,
            getNextUrlCountError: getNextUrlCountError,
          });
        });
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
  return Promise.resolve()
    .then(() => {
      return Promise.resolve().then(() => browser.storage.sync.get('hostConfigs'));
    })
    .then((res) => {
      let newBookmark = {
        title: bookmark.title,
        url: [],
        // (?<=^(.*:\/\/) -> http:// or https://
        // (.+\.)*) -> www. or any sub-domain
        // [^\.]* -> host (ensures not to get any sub-domains)
        // (?=\..{1,3}\/) (top-level-domain and everything after it)
        host: /(?<=^(.*:\/\/)(.+\.)*)[^\.]*(?=\..{1,3}\/)/.exec(bookmark.url)[0],
        currentEpisode: '',
        currentSeason: '',
        nextEpisode: [0, 0],
        nextSeason: [0, 0],
        checkContent: false,
      };
      let hostConfigs = res.hostConfigs;
      // let hostConfig = {
      //   host: '',
      //   regexNextEpisode: '',
      //   regexNextSeason: '',
      //   // content needs to be checked if site shows empty page for not existing episodes
      //   checkContent: false,
      // };
      let hostConfig = hostConfigs.filter((hostConfig) => {
        return hostConfig.host == newBookmark.host;
      })[0];

      // todo what do when website is not known?
      if (hostConfig == undefined) {
        console.log('The website ' + newBookmark.host + ' is not yet known.');
        getNextUrlCountError += 1;
        return Promise.resolve(newBookmark);
      }

      newBookmark.checkContent = hostConfig.checkContent;

      // episode count
      let regEpisode = new RegExp(hostConfig.regexNextEpisode);
      newBookmark.currentEpisode = regEpisode.exec(bookmark.url)[0];
      newBookmark.nextEpisode[0] = parseInt(newBookmark.currentEpisode) + 1;
      newBookmark.url[0] = bookmark.url.replace(regEpisode, newBookmark.nextEpisode[0]);
      getNextUrlCount += 1;

      // season Count
      if (hostConfig.regexNextSeason != undefined) {
        let regSeason = new RegExp(hostConfig.regexNextSeason);
        // set next season[0] = current season if only episode goes up
        newBookmark.currentSeason = newBookmark.nextSeason[0] = regSeason.exec(bookmark.url)[0];
        newBookmark.nextSeason[1] = parseInt(newBookmark.currentSeason) + 1;
        // set episode to 1
        newBookmark.nextEpisode[1] = 1;
        let seasonUrl = bookmark.url.replace(regEpisode, newBookmark.nextEpisode[1]);
        newBookmark.url[1] = seasonUrl.replace(regSeason, newBookmark.nextSeason[1]);
      }
      return Promise.resolve(newBookmark);
    });
}

async function checkNewEpisode(newBookmark) {
  $.each(newBookmark.url, (idx, newUrl) => {
    let xhr = new XMLHttpRequest();
    if (Boolean(newBookmark.checkContent)) {
      xhr.open('GET', newUrl, true);
    } else {
      xhr.open('HEAD', newUrl, true);
    }

    xhr.onreadystatechange = function () {
      let checkedEpisode = false;
      if (this.readyState == 4 && this.status == 200) {
        // some pages redirect if url doesn't exist
        // only check if parts after host match, in case the hosting-domain changed
        if (
          /(?<=^(.*?\/){3}).*/.exec(this.responseURL)[0] == /(?<=^(.*?\/){3}).*/.exec(newUrl)[0]
        ) {
          if (!newBookmark.checkContent || $(this.response).children().length > 1) {
            checkEpisodeCountNew += 1;
            // set bookmark to the existing episode
            newBookmark.url = newBookmark.url[idx];
            newBookmark.nextEpisode = newBookmark.nextEpisode[idx];
            newBookmark.nextSeason = newBookmark.nextSeason[idx];
            console.log(
              '+++++++++++++ page exits new:' + newUrl + ' resoponse: ' + this.responseURL
            );
            browser.runtime.sendMessage({
              newEpisode: newBookmark,
            });
            checkedEpisode = true;
          } else {
            checkedEpisode = true;
            console.log('------------- page not exits new:' + newUrl + ' resoponse: page is empty');
          }
        } else {
          checkedEpisode = true;
          console.log(
            '------------- page not exits new:' + newUrl + ' resoponse: ' + this.responseURL
          );
        }
        // if status = 4xx client-error or 5xx server-error
      } else if (this.readyState == 4 && (/4\d\d/.test(this.status) || /5\d\d/.test(this.status))) {
        checkedEpisode = true;
        console.log('------------- page not exits new:' + newUrl + ' resoponse: ' + this.status);
      }
      if (this.readyState == 4 && !Boolean(checkedEpisode)) {
        console.error('url not checked: ' + newUrl);
        checkEpisodeCountError += 1;
      }
      // only count every bookmark and not both urls
      if (this.readyState == 4 && idx == 0) {
        checkEpisodeCount += 1;
      }
      browser.runtime.sendMessage({
        checkEpisodeCountNew: checkEpisodeCountNew,
        checkEpisodeCountError: checkEpisodeCountError,
        checkEpisodeCount: checkEpisodeCount,
      });
    };

    xhr.send();
  });
}
