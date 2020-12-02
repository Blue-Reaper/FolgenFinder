function saveOptions(e) {
  let allFolders = [];
  $.each($('#bookmarkFolder').children, (idx, folder) => {
    console.log('folder.text ' + folder.text);
    allFolders.push(folder.text);
  });
  browser.storage.sync.set({
    // todo should be generic, in order to save more than just three
    // folder: [$('#folder').val(), $('#folder2').val(), $('#folder3').val()],
    folder: allFolders,
  });
  e.preventDefault();
}
// todo add onboarding process for user to enter foldernames
function restoreOptions() {
  let gettingItem = browser.storage.sync.get('folder');
  gettingItem.then((res) => {
    // $('#folder').val(res.folder[0]);
    // $('#folder2').val(res.folder[1]);
    // $('#folder3').val(res.folder[2]);
    $('#bookmarkFolder').empty();
    $.each(res.folder, (idx, folder) => {
      $('#bookmarkFolder').append($('<input type="text" class="folder" >' + folder + '</input>'));
    });
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
$('form').submit(saveOptions);
