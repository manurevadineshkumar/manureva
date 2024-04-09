const Task = require("./Task");

const LiveStorageChannel = require("../live-storage/LiveStorageChannel");

class VendorsListing extends Task {
    static SELF_UPDATE_DELAY = 60e3;

    constructor(data) {
        super(data);

        this.channel = new LiveStorageChannel("scraping-in", "scraping-out");
        this.isUpdating = false;
        this.endCallback = null;
        this.timeout = null;
    }

    async update() {
        if (this.isUpdating)
            return;

        this.isUpdating = true;

        clearTimeout(this.timeout);

        this.timeout = setTimeout(
            () => this.update(),
            VendorsListing.SELF_UPDATE_DELAY
        );

        this.setProgress({
            progress: this.status.total
                - await this.group.getInputSize()
                - await this.group.getOngoingSize()
        });

        if (await this.group.hasFinished())
            this.endCallback?.();

        this.isUpdating = false;
    }

    async run() {
        await this.channel.connect();

        await this.group.setScraping(true);

        this.setProgress({total: await this.group.getInputSize()});

        this.channel.on("update", () => this.update());

        await this.update();

        await this.channel.publish("begin");

        await new Promise(resolve => {
            this.endCallback = resolve;
        });

        await this.group.setScraping(false);

        await this.channel.publish("finish");
        await this.channel.disconnect();

        clearTimeout(this.timeout);

        this.log("=== Vendors scraping finished ===");
    }
}

module.exports = VendorsListing;
