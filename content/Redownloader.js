// Components.utils.import("resource://gre/modules/osfile.jsm")

Zotero.Redownloader = {
    async init() {
        Zotero.debug('[Redownloader] init')
        await Zotero.Schema.schemaUpdatePromise
    },

    async redownload(item) {
        // this preserves filename
        const absolutePath = item.getFilePath()
        const url = item.getField('url')
        Zotero.debug('[Redownloader] Going to download ' + url + ' as ' + absolutePath)

        let result = await fetch(url)
        let buf = new DataView(await result.arrayBuffer()) // arrayBuffer type
        await OS.File.writeAtomic(absolutePath, buf, { tmpPath: absolutePath + '.tmp', noOverwrite: true })

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
        // var ids = yield s.search()
        Zotero.debug(`[Redownloader] ${ids.length} attachments with urls`)
        for (let id of ids) {
            Zotero.debug(`[Redownloader] Checking ` + id)
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