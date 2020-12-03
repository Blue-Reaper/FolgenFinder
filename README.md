# Folgen Finder

Firefox Add-on to check for new episodes of bookmarked shows.
Only possible if the episode is shown in the url, so youtube doesn't work.

## Development

You'll need [Node.js](https://nodejs.org) installed.
Clone the source and install all dependencies:

```
git clone https://github.com/Blue-Reaper/FolgenFinder.git
cd folgenfinder
npm install
```

lint and build the extension:

```
npm run all
```

other commands:

```
npm run lint    # run all lint checks
npm run dev     # run in Firefox-Developer, open console, rebuilding and updating when files change
npm run run     # run in Firefox, rebuilding and updating when files change
npm run build   # build extension
```
