const Product = require("../../models/Product");
const ColorStorage = require("../../storage/ColorStorage");
const MaterialStorage = require("../../storage/MaterialStorage");
const ProductStorage = require("../../storage/ProductStorage");

// eslint-disable-next-line no-unused-vars
const Brand = require("../../models/Brand");
// eslint-disable-next-line no-unused-vars
const Subtype = require("../../models/Subtype");
// eslint-disable-next-line no-unused-vars
const Type = require("../../models/Type");

class ProductService {

    /**
     * Returns the country code of the product
     * @param {Product} product
     * @returns {Promise<string | null>}
     */
    static getCountryCode(product) {
        if (!product) {
            throw new Error("[ProductService#getCountryCode] Product is null");
        }

        return ProductStorage.getCountryCodeByProductId(product.id);
    }

    /**
     * Create a product with given data, brand, type and subtype
     * @param {Object} data - The data for the product.
     * @param {Brand} brand - The brand object.
     * @param {Type} type - The type object.
     * @param {Subtype} [subtype=null] - The subtype object (optional).
     * @returns {Promise<Product|null>} - The created product object or null if creation fails.
     */
    static async create(data, brand, type, subtype = null) {
        data.brand_id = brand.id;
        data.type_id = type.id;
        data.subtype_id = subtype?.id || null;

        const {image_bytes, color_ids, material_ids, ...db_data} = data;

        const id = await ProductStorage.create({
            ...db_data, brand_id: brand.id
        });

        if (!id) {
            return null;
        }

        const product = new Product({
            ...db_data,
            brand: brand.serialize(),
            type: type.serialize(),
            subtype: subtype && subtype.serialize(),
        });
        product.id = id;

        await Promise.all([
            color_ids?.length
                ? ColorStorage.setColorsByIds(id, color_ids)
                : Promise.resolve(),
            material_ids?.length
                ? MaterialStorage.setMaterialsByIds(id, material_ids)
                : Promise.resolve()
        ]);

        return product;
    }

    /**
     * Retrieves a product by its Korvin ID.
     * @param {number} id - The ID of the product.
     * @returns {Promise<Product|null>} - A promise that resolves to the product object if found, or null if not found.
     */
    static async getById(id) {
        const data = await ProductStorage.getById(id);

        return data ? new Product(data) : null;
    }

}

module.exports = ProductService;
