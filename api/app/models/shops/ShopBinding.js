const ShopBindingStorage = require("../../storage/ShopBindingStorage");

const TypeStorage = require("../../storage/TypeStorage");
const BrandStorage = require("../../storage/BrandStorage");
const ColorStorage = require("../../storage/ColorStorage");
const MaterialStorage = require("../../storage/MaterialStorage");

const Type = require("../Type");
const Brand = require("../Brand");
const Color = require("../Color");
const Material = require("../Material");

class ShopBinding {
    constructor(data) {
        this.attributeId = +data.attribute_id;
        this.attributeValueId = data.attribute_value_id;
        this.entity = data.entity;
    }

    serialize() {
        return {
            attribute_id: +this.attributeId || null,
            attribute_value_id: this.attributeValueId,
            ...(this.entity ? {entity: this.entity} : {})
        };
    }

    static async listForShopByCategory(shop_id, category) {
        const HANDLERS = {
            genders: async () => [
                {id: 0, name: "Female"},
                {id: 1, name: "Male"}
            ],
            types: TypeStorage.listAll,
            brands: BrandStorage.listAll,
            colors: ColorStorage.listAll,
            materials: MaterialStorage.listAll
        };
        const handler = HANDLERS[category];

        return {
            entities: handler ? await handler() : [],
            bindings: await ShopBindingStorage.listCategoryBindings(
                shop_id, category
            )
        };
    }

    static async validateBindingAttribute(user_id, category, korvin_id) {
        const HANDLERS = {
            genders: async id => [0, 1].includes(id),
            types: TypeStorage.getById,
            brands: BrandStorage.getById,
            colors: ColorStorage.getById,
            materials: MaterialStorage.getById
        };
        const handler = HANDLERS[category];

        if (!handler)
            return false;

        return !!await handler(korvin_id);
    }

    static async makeBindingEntity(type, data) {
        const HANDLERS = {
            genders: data => data,
            types: data => new Type(data),
            brands: data => new Brand(data),
            colors: data => new Color(data),
            materials: data => new Material(data)
        };

        return HANDLERS[type]?.(data) || {type, ...data};
    }

    static async addForShop(category, korvin_id, shop_id, attribute_value_id) {
        return await ShopBindingStorage.addForShop(
            category, korvin_id, shop_id, attribute_value_id
        );
    }

    static async deleteForShop(
        category, korvin_id, shop_id, attribute_value_id
    ) {
        return await ShopBindingStorage.deleteForShop(
            category, korvin_id, shop_id, attribute_value_id
        );
    }
}

module.exports = ShopBinding;
