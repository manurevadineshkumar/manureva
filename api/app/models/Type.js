const TypeStorage = require("../storage/TypeStorage");

class Type {
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
        const id = await TypeStorage.create(name);

        return new Type({id, name});
    }

    static async getById(id) {
        const data = await TypeStorage.getById(id);

        return data ? new Type(data) : null;
    }

    static async getByName(name) {
        const data = await TypeStorage.getByName(name);

        return data ? new Type(data) : null;
    }

    static async list() {
        const data = await TypeStorage.listAll();

        return data.map(data => new Type(data));
    }

    async delete() {
        return await TypeStorage.delete(this.id);
    }
}

module.exports = Type;
