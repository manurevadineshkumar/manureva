const MaterialStorage = require("../storage/MaterialStorage");

class Material {
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

    static async listAll() {
        const data = await MaterialStorage.listAll();

        return data.map(data => new Material(data));
    }

    static async getById(id) {
        const data = await MaterialStorage.getById(id);

        if (!data) {
            return null;
        }

        return new Material(data);
    }

    static async getByName(name) {
        const data = await MaterialStorage.getByName(name);

        if (!data) {
            return null;
        }

        return new Material(data);
    }

    static async create(name) {
        const id = await MaterialStorage.create(name);

        return await Material.getById(id);
    }

    async delete() {
        await MaterialStorage.delete(this.id);
    }
}

module.exports = Material;
