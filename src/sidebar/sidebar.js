setInitialStyle();

// Set the element style when the extension page loads
async function setInitialStyle() {
  const theme = await browser.theme.getCurrent();
  setSidebarStyle(theme);
}

function setSidebarStyle(theme) {
  if (theme.colors && theme.colors.sidebar) {
    document.body.style.backgroundColor = theme.colors.sidebar;
  }

  if (theme.colors && theme.colors.toolbar_field) {
    let style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    let css = ':root { --sidebar-highlight: ' + theme.colors.toolbar_field + ';}';
    style.appendChild(document.createTextNode(css));
    document.head.append(style);
  }

  if (theme.colors && theme.colors.toolbar_field_text) {
    let style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    let css = ':root { --sidebar-text: ' + theme.colors.toolbar_field_text + ';}';
    style.appendChild(document.createTextNode(css));
    document.head.append(style);
  }
}

// Watch for theme updates
browser.theme.onUpdated.addListener(async ({ theme, windowId }) => {
  const sidebarWindow = await browser.windows.getCurrent();
  /*
      Only update theme if it applies to the window the sidebar is in.
      If a windowId is passed during an update, it means that the theme is applied to that specific window.
      Otherwise, the theme is applied globally to all windows.
    */
  if (!windowId || windowId == sidebarWindow.id) {
    setSidebarStyle(theme);
  }
});

// reload "new episodes" when sidebar opend
reload();

function reload() {
  $('#newEpisodes').empty();
  $('.count').empty();
  browser.runtime.sendMessage({
    reload: 'start',
  });
}

readOptions();
browser.storage.onChanged.addListener(readOptions);
function readOptions() {
  let gettingItem = browser.storage.sync.get('folder');
  gettingItem.then((res) => {
    $('#bookmarkFolder').empty();
    $.each(res.folder, (idx, folder) => {
      let button = $('<div class="button">' + folder + '</div>');
      button.click(() => {
        browser.storage.sync
          .set({
            activeFolder: folder,
          })
          .then(() => reload());
      });
      $('#bookmarkFolder').append(button);
    });
  });
}

// Listen for messages from other scripts
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  let showNewEpisodes = $('#newEpisodes');
  if (request.reload != undefined && request.reload == 'end') {
    // reload finished (except async) if no messages recieved, no new episodes
    showNewEpisodes.removeClass('hidden');
    $('#counts').append($('<div>bookmarks: ' + request.bookmarkCount + '</div>'));
    if (request.bookmarkCount != request.loopCount) {
      $('#counts').append($('<div>!!to little loops: ' + request.loopCount + '</div>'));
    }
    $('#counts').append(
      $(
        '<div>nextUrl: ' +
          request.getNextUrlCount +
          ' unknown Host: ' +
          request.getNextUrlCountError +
          ' = ' +
          (request.getNextUrlCount + request.getNextUrlCountError) +
          '</div>'
      )
    );
  } else if (request.newEpisode != undefined) {
    showNewEpisodes.append(
      $(
        '<a href="' +
          request.newEpisode +
          '"><div class="title">' +
          request.newEpisode.split('/')[2] +
          '</div><div>' +
          request.newEpisode +
          '</div> </div>'
      )
    );
    showNewEpisodes.removeClass('hidden');
  } else if (request.checkEpisodeCount != undefined) {
    $('#checked').empty();
    $('#checked').append(
      $(
        '<div>New Episodes: ' +
          request.checkEpisodeCountNew +
          ' old: ' +
          request.checkEpisodeCount +
          ' = ' +
          (request.checkEpisodeCountNew + request.checkEpisodeCount) +
          '</div>'
      )
    );
  }
});
