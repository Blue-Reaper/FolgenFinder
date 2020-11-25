browserAction();

function browserAction() {
  // console.log('open popup');

  browser.runtime.sendMessage({
    reload: 'start',
  });
}
