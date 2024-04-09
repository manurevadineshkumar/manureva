const ShopAttributeStorage = require("../../storage/ShopAttributeStorage");

class ShopAttribute {
    constructor(data) {
        this.id = +data.id;
        this.shopId = data.shop_id;
        this.name = data.name;
        this.values = data.values || null;
    }

    serialize() {
        return {
            id: +this.id,
            name: this.name,
            ...(this.values ? {values: this.values} : {})
        };
    }

    static async valueIdExists(shop_id, shop_attribute_value_id) {
        return !!await ShopAttributeStorage.valueIdExists(
            shop_id, shop_attribute_value_id
        );
    }

    static async listForShop(shop_id) {
        const data = await ShopAttributeStorage.listForShop(shop_id);

        return data.map(data => new ShopAttribute(data));
    }

    async setValues(values) {
        return await ShopAttributeStorage.setValues(this.id, values);
    }

    static async setForShop(shop_id, attributes) {
        return await ShopAttributeStorage.setForShop(shop_id, attributes);
    }
}

module.exports = ShopAttribute;
