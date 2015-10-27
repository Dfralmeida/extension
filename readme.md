# Chrome Extension to fetch flights

> Google Chrome Extension that searches flights for multiples filters given by the user, such as multiple origin and destination cities, multiple dates, number of adults, children and infants. It also can send an email in case of finding fares under a given price and can save a CSV file with found prices.


## Development

To test the extension locally, you need to follow these steps:

### Prepare your environment

1. Clone this repository into your computer
  * `git clone https://github.com/brenovieira/extension.git` (it downloads the repo and creates `extension` folder)
2. Enter the folder you just created
  * `cd extension`
3. Install dependencies
  * install [Node.js](http://nodejs.org/) and NPM
  * install global dev dependencies: `npm install -g bower gulp`
  * install local dev dependencies: `npm install && bower install` in repository directory
  * npm dependencies will appear under `node_modules` folder and bower dependencies under `bower_components` folder
4. Build the project
  * `gulp build` (create `dist` folder)
5. Enter google chrome extensions page and load the extension locally
  * on chrome, go to `chrome://extensions`
  * enable `Developer mode` (it's a check box on the upper right corner. After selecting this, 3 buttons will appear)
  * click on the first button (`load unpacked extension`)
  * select the extension folder created on step 1 (it'll load the configuration file `manifest.json` and the extension should appear)


### Notes:
```
git must be on your path.  If you can't do the command 'git' from your terminal, then install git first and make sure you have access from the path. Then make sure you have installed both npm, bower and gulp since we're using these.
```

### Adding a language

The languages are just a `messages.json` file under "the language" folder under `_locales` folder.

```
_locales
├─── pt_BR
│   │   messages.json
├─── en
│   │   messages.json
```

For example, to add a spanish language, just add a new folder called `es` under `_locales` with a file `messages.json`.
The file `messages.json` is just a key value list. Where the values are the messages we show to the user in that language.

So, just copy and paste another `messages.json` and translate it.

The method `chrome.i18n.getMessage()` gets the message from `messages.json` from the current language folder. See it [here](https://github.com/brenovieira/extension/blob/master/src/popup/app.constants.js#L7).

The method `chrome.i18n.getUILanguage()` gets the current language. See it [here](https://github.com/brenovieira/extension/blob/master/src/popup/app.controller.js#L426).


### Adding a new site

The sites are under `src/background/sites`folder.

```
src
├─── background
│   │   ├─── sites
│   │   │   decolar.js
│   │   │   miles.smiles.js
│   │   │   ...
```

Just copy and paste an existing one, it'll appear on the select on popup page.
Then change the necessary code (like site specific url and mappings to get the right values, ...).

### Gulp Commands

* `gulp` to build and watch
* `gulp build` to build background and popup files
* `gulp watch` to watch src files to build when changed
* `gulp zip` to create the zip file to publish 
* `gulp background` to build background page scripts 
* `gulp popup:libs` to build 3rd-party libs
* `gulp popup:js` to build our scripts used on popop
* `gulp popup:css` to compile and minify less files (create css used on popup)


### If you need more information

1. About step 1, please visit [Cloning a repository](https://help.github.com/articles/cloning-a-repository/) and [Fork A Repo](https://help.github.com/articles/fork-a-repo/).
2. About node and npm, please visit [Installing Node.js](https://docs.npmjs.com/getting-started/installing-node).
3. About gulp, visit [Gulp Getting Started](https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md).
4. About bower, visit [Bower Getting Started](http://bower.io/#getting-started).
5. About step 5, visit [Building a Chrome Extension - Load the extension](https://developer.chrome.com/extensions/getstarted#unpacked).
6. About less, visit [Less Getting Started](http://lesscss.org/).
7. About Google Chrome Extension, visit [Google Chrome Extension Developer's Guide](http://developer.chrome.com/extensions/devguide.html).
8. About extension internationalization, visit [chrome.i18n](https://developer.chrome.com/extensions/i18n).

## Issues

If you find an issue, feel free to report it on [issues](https://github.com/brenovieira/extensao/issues/new) or just email me at genghislabs@gmail.com.


## Contribute

We're gonna be happy with any contribution, either giving a feedback, reporting an issue or developing more features.
To add more features or fix an issue, you must fork this project, then open a pull request.


## Roadmap

To evolve this app, there are several features that I already thought, such as:

- Save prices found on database to show all prices found by everyone
- Add other known flight engines, for example, skyscanner or kayak
- Add locales for other countries
- Add other loyalt programs as Advantage (American Airlines), Executive Club (British Airways), Victoria (TAP), ...
- Add feature to search different flight legs in same ticket, known as multi cities (A -> B and C -> A or A -> B, B -> C, C -> A)
- Add hotels booking

These are just the ones I thought, but you can help gather other useful features.
Feel free to open an issue to suggest another feature.