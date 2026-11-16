# Browser extension

This single Manifest V3 extension works in Chrome, Edge and Firefox. Click its toolbar button on a product page, then **Add product page**. It opens the server app with the URL in the import form. Review the name, image and EUR price before saving; some shops block automatic import. The extension only requests access to the active tab after you click it. When you choose **Add product page**, it sends that page's URL to the shopping-cart website. It does not read other tabs or save account data.

## Install for testing

- **Chrome:** Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this `extension` folder.
- **Edge:** Open `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select this `extension` folder.
- **Firefox:** Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `manifest.json` from this folder. Temporary add-ons must be reloaded after Firefox restarts. Permanent Firefox distribution requires signing through Mozilla Add-ons.

The downloadable ZIP on the website contains this folder's files. Extract it first for Chrome and Edge. For Firefox, extract it and choose `manifest.json` as above.
