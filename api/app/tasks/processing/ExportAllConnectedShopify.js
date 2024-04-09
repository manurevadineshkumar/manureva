// @ts-nocheck
// import Shop from "../../models/shops/Shop";
// import ListingIterator from "../../services/ListingIterator";
// import Task from "../Task";
const Shop = require("../../models/shops/Shop");
const ListingIterator = require("../../services/ListingIterator");
const Task = require("../Task");
const TaskGroupLiveStorage = require("../../live-storage/TaskGroupLiveStorage");

class ExportAllConnectedShopify extends Task {

    constructor(data) {
        super(data);
        this.status = {progress: 0, failed: 0, total: 0};
    }

    async run() {
        let prev_id = 0;
        const allConnectedExportingShops = new ListingIterator(
            async () => await Shop.listAllConnectedAndExporting(prev_id, 1024));
        const shopTasks = [];

        const total = await Shop.countAllConnectedAndExporting(prev_id, 1024);
        this.setProgress({total: total});
        for await (let shop of allConnectedExportingShops) {
            try {
                shopTasks.push({
                    "operation_id": "exportToConnectedShopify",
                    "params": {
                        "store": `${shop.url.split(".")[0]}`,
                        "token": `${shop.token}`,
                        "id": `${shop.id}`,
                        "price_type": ""
                    }
                });
                prev_id = shop.id;
                this.setProgress({progress: this.status.progress + 1});
            } catch (err) {
                this.setProgress({
                    progress: this.status.progress + 1,
                    failed: this.status.failed + 1
                });
                this.log({"Error processing ExportAllConnectedShopify:": err});
            }
        }
        await TaskGroupLiveStorage.createQueued(
            {
                "title": "Export Connected Shopify only",
                "date": Date.now(),
                "inputs": [],
                "tasks": [shopTasks],
            }
        );
    }
}

module.exports = ExportAllConnectedShopify;
