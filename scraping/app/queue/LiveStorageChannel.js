const {EventEmitter} = require("events");

const LiveStorage = require("./LiveStorage");

class LiveStorageChannel extends EventEmitter {
    constructor(pub_channel, sub_channel) {
        super();

        this.pubChannel = pub_channel;
        this.subChannel = sub_channel;
        this.client     = null;
    }

    async connect() {
        this.client = LiveStorage.client.duplicate();

        await this.client.connect();

        await this.client.subscribe(this.subChannel, async message => {
            const {type, data} = JSON.parse(message);

            this.emit(type, data);
        });
    }

    async publish(type, data = null) {
        return await LiveStorage.run(
            "PUBLISH",
            this.pubChannel,
            JSON.stringify({type, ...(data ? {data} : {})})
        );
    }

    async disconnect() {
        if (!this.client)
            return;

        await this.client.unsubscribe(this.subChannel);
        await this.client.quit();
    }
}

module.exports = LiveStorageChannel;
