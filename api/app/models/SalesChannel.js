const SalesChannelStorage = require("../storage/SalesChannelStorage");

class SalesChannel {
    constructor(data) {
        this.id = +data.id;
        this.name = data.name;
        this.ratio = data.ratio;
        this.type = data.type;
    }

    serialize() {
        return {
            id: +this.id,
            name: this.name,
            ratio: this.ratio,
            type: this.type
        };
    }

    static async listAll(prev_id = 0, batch_size = 16) {
        const data = await SalesChannelStorage.listAll(prev_id, batch_size);

        return data.map(data => new SalesChannel(data));
    }

    static async getById(id) {
        const data = await SalesChannelStorage.getById(id);

        return data ? new SalesChannel(data) : null;
    }
}

module.exports = SalesChannel;
