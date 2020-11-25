browserAction();

function browserAction() {
  var defaultId = getDefaultFolderId();
  defaultId.then((id) => console.log('Id: ' + id));
}

function getDefaultFolderId() {
  //idea set folder name in settings and only default is "FolgenFinder"
  return Promise.resolve()
    .then(() => browser.bookmarks.search({ title: 'FolgenFinder' }))
    .then((result) => {
      if (result.length == 0) {
        console.log('Default folder not found.');
        // create default folder if not exists
        return Promise.resolve()
          .then(function () {
            return browser.bookmarks.create({
              title: 'FolgenFinder',
            });
          })
          .then(function (result) {
            return result.id;
          });
      } else if (result.length > 1) {
        //   ToDo add error handling
        console.error('More than one folder "' + result[0].title + '" found.');
      } else {
        return result[0].id;
      }
    })
    .catch((err) => {
      if (err) {
        console.error(err);
      }

      return Promise.resolve();
    });
}
