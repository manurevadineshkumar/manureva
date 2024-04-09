const ColorStorage = require("../storage/ColorStorage");

class Color {
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
        const data = await ColorStorage.listAll();

        return data.map(data => new Color(data));
    }

    static async getById(id) {
        const data = await ColorStorage.getById(id);

        if (!data) {
            return null;
        }

        return new Color(data);
    }

    static async getByName(name) {
        const data = await ColorStorage.getByName(name);

        if (!data) {
            return null;
        }

        return new Color(data);
    }

    static async create(name) {
        const id = await ColorStorage.create(name);

        return await Color.getById(id);
    }

    async delete() {
        return await ColorStorage.delete(this.id);
    }
}

module.exports = Color;
