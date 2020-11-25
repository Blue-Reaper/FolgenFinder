setInitialStyle();

// Set the element style when the extension page loads
async function setInitialStyle() {
  const theme = await browser.theme.getCurrent();
  setSidebarStyle(theme);
}

function setSidebarStyle(theme) {
  if (theme.colors && theme.colors.frame) {
    document.body.style.backgroundColor = theme.colors.frame;
  } else {
    document.body.style.backgroundColor = 'white';
  }

  if (theme.colors && theme.colors.toolbar) {
    myElement.style.backgroundColor = theme.colors.toolbar;
  } else {
    myElement.style.backgroundColor = '#ebebeb';
  }

  if (theme.colors && theme.colors.toolbar_text) {
    myElement.style.color = theme.colors.toolbar_text;
  } else {
    // myElement.style.color = 'black';
    myElement.style.color = 'white';
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

let listNewEpisodes = '';

// Listen for messages from other scripts
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.reload != undefined && request.reload == 'start') {
    // empty previous results
    listNewEpisodes = '';
  } else if (request.reload != undefined && request.reload == 'end') {
    // reload finished (except async) if no messages recieved, no new episodes
    newEpisodes.classList.remove('hidden');
    if (listNewEpisodes != '') {
      newEpisodes.innerHTML = listNewEpisodes;
    }
  } else if (request.newEpisode != undefined) {
    listNewEpisodes +=
      '<a href="' + request.newEpisode + '" >' + request.newEpisode + '</a>';
    newEpisodes.classList.remove('hidden');
    newEpisodes.innerHTML = listNewEpisodes;
  }
});
