// This file sets some options for easier debugging, only in development
// This file makes development easier

browser.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
  //during development
  if (temporary) {
    // show popup in tab
    // browser.tabs.create({ url: 'browserAction/popup.html' });

    // show sidebar in tab
    // browser.tabs.create({ url: 'sidebar/sidebar.html' });

    // set options
    browser.storage.sync.set({
      folder: ['Am Lesen', 'Season End', 'Am Schauen', 'Hold'],
      activeFolder: 'Am Lesen',
    });

    let hostConfigs = [];
    hostConfigs.push({
      host: 'reaperscans',
      // can't save regex in storage, so use string
      regexNextEpisode: regexToString(/(?<=^(.*?\/){6})\d+/),
      regexNextSeason: regexToString(/(?<=^(.*?\/){5})\d+(?=\/.*)/),
      // content needs to be checked if site shows empty page for not existing episodes
      checkContent: false,
    });
    hostConfigs.push({
      host: 'edelgardescans',
      regexNextEpisode: regexToString(/(?<=^(.*?\/){6})\d+/),
      regexNextSeason: regexToString(/(?<=^(.*?\/){5})\d+(?=\/.*)/),
      // content needs to be checked if site shows empty page for not existing episodes
      checkContent: false,
    });
    hostConfigs.push({
      host: 'leviatanscans',
      regexNextEpisode: regexToString(/(?<=^(.*?\/){6})\d+/),
      regexNextSeason: regexToString(/(?<=^(.*?\/){5})\d+(?=\/.*)/),
      // content needs to be checked if site shows empty page for not existing episodes
      checkContent: false,
    });
    hostConfigs.push({
      host: 'skscans',
      regexNextEpisode: regexToString(/(?<=^(.*?\/){6})\d+/),
      regexNextSeason: regexToString(/(?<=^(.*?\/){5})\d+(?=\/.*)/),
      // content needs to be checked if site shows empty page for not existing episodes
      checkContent: false,
    });
    hostConfigs.push({
      host: 'lhtranslation',
      regexNextEpisode: regexToString(/(?<=^(.*?\/){3}(.*?-)*)\d*(?=\.html)/),
      checkContent: true,
    });
    hostConfigs.push({
      host: 'mangasushi',
      regexNextEpisode: regexToString(/(?<=^(.*?\/){5}chapter-)\d*(?=\/.*)/),
      checkContent: false,
    });
    hostConfigs.push({
      host: 'watch-series',
      regexNextEpisode: regexToString(/(?<=^(.*?\/){4}(.*\_)*e)\d*(?=\.html)/),
      regexNextSeason: regexToString(/(?<=^(.*?\/){4}(.*\_)*s).\d*(?=\_e.*\.html)/),
      checkContent: false,
    });
    hostConfigs.push({
      host: 'swatchseries',
      regexNextEpisode: regexToString(/(?<=^(.*?\/){4}(.*\_)*e)\d*(?=\.html)/),
      regexNextSeason: regexToString(/(?<=^(.*?\/){4}(.*\_)*s).\d*(?=\_e.*\.html)/),
      checkContent: false,
    });
    // todo why the flase positive?
    hostConfigs.push({
      host: 'yesmovies',
      regexNextEpisode: regexToString(/(?<=^(.*?\/){5})\d*(?=-.*)/),
      regexNextSeason: regexToString(/(?<=^(.*?\/){4}.*season-)\d*(?=-.*)/),
      checkContent: false,
    });

    browser.storage.sync.set({
      hostConfigs: hostConfigs,
    });
  }
});

function regexToString(regex) {
  // delete first and last /
  return regex.toString().replaceAll(/(^\/|\/$)/g, '');
}
