// Put all the javascript code here, that you want to execute in background.

let listNewEpisodes = [];

// Listen for messages from extensions_scripts
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // console.log('trigger: ' + request.trigger);
  if (request.trigger == 'checkBookmarks') {
    checkBookmarks();
  }
});

function checkBookmarks() {
  // empty previous results
  listNewEpisodes = [];

  return Promise.resolve()
    .then(() => getBookmarksFromRootFolder())
    .then((bookmarkItems) => {
      if (bookmarkItems == undefined || bookmarkItems.length == 0) {
        // no existiting bookmarks
        return Promise.resolve();
      }
      // console.log('bookmark count: ' + bookmarkItems.length);
      $.each(bookmarkItems, (idx, bookmark) =>
        checkNewEpisode(getUrlNextEpisode(bookmark))
      );
    })
    .catch((err) => {
      if (err) {
        console.error(err);
      }
      return Promise.resolve();
    });
}

function getBookmarksFromRootFolder() {
  //idea set folder name in settings and only default is "FolgenFinder"
  return Promise.resolve()
    .then(() => browser.bookmarks.search({ title: 'FolgenFinder' }))
    .then((rootFolder) => {
      if (rootFolder.length == 0) {
        console.log('Default folder not found.');
        // create default folder if not exists
        return Promise.resolve()
          .then(function () {
            return browser.bookmarks.create({
              title: 'FolgenFinder',
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
    .then((rootId) => {
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
      z;
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
      urlParts[6] = parseInt(urlParts[6]) + 1;
      break;
    default:
      // todo what do when website not known?
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
      } else {
        console.log('------------- page not exits ' + newUrl);
      }
    }
  };

  xhr.send();
}
