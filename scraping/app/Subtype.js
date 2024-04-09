const SubtypeStorage = require("./storage/SubtypeStorage");

class Subtype {
    constructor(data) {
        this.id = +data.id;
        this.name = data.name;
    }

    serialize() {
        return {
            id: +this.id,
            name: this.name,
        };
    }

    static async create(name) {
        const id = await SubtypeStorage.create(name);

        return new Subtype({ id, name });
    }

    static async getById(id) {
        const data = await SubtypeStorage.getById(id);

        return data ? new Subtype(data) : null;
    }

    static async getByName(name) {
        const data = await SubtypeStorage.getByName(name);

        return data ? new Subtype(data) : null;
    }

    static async list(prev_id = 0, batch_size = 16) {
        const data = await SubtypeStorage.listAll(prev_id, batch_size);

        return data.map(data => new Subtype(data));
    }
}

module.exports = Subtype;
