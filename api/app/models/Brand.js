const BrandStorage = require("../storage/BrandStorage");

class Brand {
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
        const id = await BrandStorage.create(name);

        return new Brand({id, name});
    }

    static async getById(id) {
        const data = await BrandStorage.getById(id);

        return data ? new Brand(data) : null;
    }

    static async getByName(name) {
        const data = await BrandStorage.getByName(name);

        return data ? new Brand(data) : null;
    }

    static async list() {
        const data = await BrandStorage.listAll();

        return data.map(data => new Brand(data));
    }

    async delete() {
        return BrandStorage.delete(this.id);
    }
}

module.exports = Brand;
