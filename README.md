# Zotero Redownloader

Scan your library and download missing attachments from urls. Not limited to pdfs.
If you download pdfs mostly from open-access sites (arxiv, openreview, etc), you don't need a cloud storage to store the pdfs between multiple computers.

## Install

Zotero->Tools->Addons. Drag `.xpi` file to the window.

### Git
Clone the repo, `npm install`. Then `npm run build` creates `zotero-redownloader.xpi`.
Or, you can just zip this repo (README.md on the root) and rename `.zip` to `.xpi`.


## TODO
- [ ] download files behind authentication.
- [ ] Properly lock Zotero DB when downloading. File write is already atomic.
