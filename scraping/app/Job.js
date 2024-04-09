const crypto = require("crypto");

class Job {
    constructor(data) {
        this.uuid   = data.uuid;
        this.vendor = data.vendor;
        this.url    = data.url;
        this.type   = data.type;
        this.params = data.params;
    }

    serialize() {
        return {
            uuid:   this.uuid,
            vendor: this.vendor,
            url:    this.url,
            type:   this.type,
            params: this.params
        };
    }

    toString() {
        return JSON.stringify(this.serialize());
    }

    static create({vendor, url, type, params}) {
        return new Job({
            uuid: crypto.randomUUID(),
            vendor,
            url: url || params?.url || null,
            type,
            params
        });
    }

    static parse(data) {
        if (typeof data == "string")
            data = JSON.parse(data);

        return data
            ? new Job({
                uuid:   data.uuid || crypto.randomUUID(),
                vendor: data.vendor,
                url:    data.url || data.params?.url || null,
                type:   data.type,
                params: data.params
            })
            : null;
    }
}

module.exports = Job;
