setInitialStyle();

// Set the element style when the extension page loads
async function setInitialStyle() {
  const theme = await browser.theme.getCurrent();
  setSidebarStyle(theme);
}

function setSidebarStyle(theme) {
  if (theme.colors && theme.colors.popup) {
    $('body').css('background-color', theme.colors.popup);
  }

  if (!isLlight(theme.colors.frame)) {
    $('head').append(
      $(
        '<style type="text/css"> :root { --ghostbutton-color: rgba(249, 249, 250, 0.8);} </style>'
        // todo add dark :hover and :active
      )
    );
  }
}

function isLlight(color) {
  // Variables for red, green, blue values
  let r, g, b, hsp;

  // Check the format of the color, HEX or RGB?
  if (color.match(/^rgb/)) {
    // If RGB --> store the red, green, blue values in separate variables
    color = color.match(
      /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/
    );

    r = color[1];
    g = color[2];
    b = color[3];
  } else {
    // If hex --> Convert it to RGB: http://gist.github.com/983661
    color = +('0x' + color.slice(1).replace(color.length < 5 && /./g, '$&$&'));

    r = color >> 16;
    g = (color >> 8) & 255;
    b = color & 255;
  }

  // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
  hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));

  // Using the HSP value, determine whether the color is light or dark
  if (hsp > 127.5) {
    // light
    return true;
  } else {
    // dark
    return false;
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

initialize();

$('.new.ghostbutton').addClass('disabled');
$('.reload.ghostbutton').click(reload);
$('.sidebar.ghostbutton').click(() => {
  browser.sidebarAction.toggle();
  updateSidebarButton();
  // idea close popup after click
});

function initialize() {
  // reload();
  updateSidebarButton();
}

function updateSidebarButton() {
  browser.sidebarAction.isOpen({}).then((isOpen) => {
    if (isOpen) {
      $('.sidebar.ghostbutton').addClass('active');
    } else {
      $('.sidebar.ghostbutton').removeClass('active');
    }
  });
}

function reload() {
  browser.runtime.sendMessage({
    reload: 'start',
  });
}
