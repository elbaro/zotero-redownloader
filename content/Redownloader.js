// Components.utils.import("resource://gre/modules/osfile.jsm")

Zotero.Redownloader = {
    async init() {
        Zotero.debug('[Redownloader] init')
        await Zotero.Schema.schemaUpdatePromise
    },

    async redownload(item) {
        // we preserve filename
        const absolutePath = item.getFilePath()
        if (absolutePath == false) {
            // something wrong with path, broken or N/A
            // https://github.com/zotero/zotero/blob/c735423996bdbba202b362233c8b6c22e3ca31fd/chrome/content/zotero/xpcom/data/item.js#L2165
            return;
        }
        const url = item.getField('url')
        Zotero.debug(`[Redownloader] Going to download ${url} as ${absolutePath}`)

        let result = await fetch(url)
        let buf = new DataView(await result.arrayBuffer()) // arrayBuffer type

        try {
            await OS.File.makeDir(OS.Path.dirname(absolutePath))
        } catch (err) {
            // dir already exist
        }

        // we cannot use OS.Constants.Path.tmpDir
        // since it can be cross-device
        // const tmpPath = OS.Path.join(OS.Constants.Path.tmpDir, `redownloader_${item.id}_${OS.Path.basename(absolutePath)}`)
        const tmpPath = absolutePath + '.tmp'
        await OS.File.writeAtomic(absolutePath, buf, { tmpPath: tmpPath, noOverwrite: true })

        item.relinkAttachmentFile(absolutePath)
        item.saveTx()
        Zotero.debug('[Redownloader] Download completed: ' + absolutePath)
    },

    async scan() {
        await this.init()
        Zotero.debug('[Redownloader] scan')

        // Zotero.Attachments.LINK_MODE_LINKED_URL // ignore
        // Zotero.Attachments.LINK_MODE_LINKED_FILE // ignore?
        // Zotero.Attachments.LINK_MODE_IMPORTED_URL // snapshot
        // Zotero.Attachments.LINK_MODE_IMPORTED_FILE

        let s = new Zotero.Search()
        // https://github.com/zotero/zotero/blob/43a2045aecff9bf1efcf50841519b1ac2ec85c3e/chrome/content/zotero/xpcom/search.js#L1821
        // 1. attachments
        // 2. not deleted
        // 3. not link
        // 4. file does not exist
        s.addCondition("itemType", "is", "attachment")
        s.addCondition("deleted", "false")
        s.addCondition("url", "contains", "http")
        var ids = await s.search()
        Zotero.debug(`[Redownloader] ${ids.length} attachments with urls`)
        for (let id of ids) {
            let item = await Zotero.Items.getAsync(id)
            await item.loadAllData()
            if (!item.isLinkedURL && !(await item.getFilePathAsync())) {
                // TODO wrap this is Zotero.DB.executeTransaction -- how to do this with async?
                // https://groups.google.com/forum/#!msg/zotero-dev/efFuMEqLarY/Xj3_NKiiEwAJ
                await this.redownload(item)
            }
        }
    }
}

window.addEventListener('load', e => { Zotero.Redownloader.init() }, false)
