// eslint-disable-next-line no-unused-vars
const Shop = require("../../../models/shops/Shop");
const ShopBindingStorage = require("../../../storage/ShopBindingStorage");

class ShopifyBindingService {

    /**
     * Matches a Shopify product to its bindings.
     * @param {Object} options - The options for matching the Shopify product to bindings.
     * @param {Shop} options.shop - The shop object.
     * @param {Object} options.shopifyProduct - The Shopify product object.
     * @throws {Error} - If the product is missing type or vendor.
     */
    static async matchShopifyProductToBindings({shop, shopifyProduct}) {
        // Initialize binding data
        const shopifyProductBindingData = {
            type: [],
            vendor: [],
            "metafield:colors": [],
            "metafield:materials": []
        };

        shopifyProductBindingData.type = [shopifyProduct.productType];
        shopifyProductBindingData.vendor = [shopifyProduct.vendor];

        if (!shopifyProductBindingData.type || !shopifyProductBindingData.vendor) {
            throw new Error("Product is missing type or vendor");
        }

        const rawColors = shopifyProduct
            .metafields
            .find((metafield) => {return metafield.key === "colors";})
            ?.value;
        shopifyProductBindingData["metafield:colors"] = rawColors ? JSON.parse(rawColors) : [];

        const rawMaterials = shopifyProduct
            .metafields
            .find((metafield) => {return metafield.key === "materials";})
            ?.value;
        shopifyProductBindingData["metafield:materials"] = rawMaterials ? JSON.parse(rawMaterials) : [];

        const PRIORITIES = {
            type: 3,
            vendor: 2,
            tag: 0,
            default: 1
        };

        // Initialize binding categories
        const binding_categories = {
            genders: [],
            types: [],
            brands: [],
            colors: [],
            materials: []
        };

        await Promise.all(Object.entries(shopifyProductBindingData)
            .map(async ([name, values]) => {
                await Promise.all(values.map(async value => {
                    const bindings = await shop.getImportBinding(name, value);

                    if (!bindings.length) {
                        console.info(`Unknown binding ${name}: ${value} for shop ${shop.name}`);
                    }

                    bindings.forEach(({category, korvin_id}) => {
                        binding_categories[category].push({
                            id: korvin_id,
                            priority: PRIORITIES[name] || PRIORITIES.default
                        });
                    });
                }));
            })
        );

        return binding_categories;
    }

    /**
     * Retrieves export bindings for a specific shop and Korvin entities.
     * @param {Object} options - The options for retrieving export bindings.
     * @param {Shop} options.shop - The shop object.
     * @param {[string, number][]} options.korvin_entities - The array of Korvin entities.
     * The string can be one of "genders","types","brands","colors" or "materials"
     * @returns {Promise<Array<{
     *  name: string,
     *  value: string
     * }>>} - A promise that resolves to an array of export bindings.
     * `name` is the name of the field on shopify. `value` is the value of the field on shopify.
     * @example getExportedBindings([["colors", 25], ["materials", 1]])
     * returns [
     *  {name: 'metafield:colors', value: 'blanc'},
     *  {name: 'metafield:materials', value: 'leather'}
     * ]
     */
    static async getExportBindings({shop, korvin_entities}) {
        return await ShopBindingStorage.getExportBindings(
            shop.id,
            korvin_entities
        );
    }

    /**
     * Builds the product fields based on the given bindings.
     * @param {Array<{
     *  name: string,
     *  value: string
     * }>} bindings - The bindings to build the product fields from.
     * @returns {{
     *  product_type: string,
     *  tags: Set<string>,
     *  metafields: Object<string, Set<string>>
     * }} - The built product fields containing product_type, tags, and metafields.
     */
    static buildProductFields(bindings) {
        let product_type = null;
        let tags = new Set();

        /** @type {Object<string, Set<string>>} */
        const metafields = {};

        bindings.forEach(({name, value}) => {
            if (name === "type") {
                product_type = product_type || value;
                return;
            }
            if (name === "tag") {
                tags.add(value);
                return;
            }
            if (name.startsWith("metafield:")) {
                const metafield_name = name.substring(10);

                if (!metafields[metafield_name]) {
                    metafields[metafield_name] = new Set();
                }

                metafields[metafield_name].add(value);
            }
        });

        return {product_type, tags, metafields};
    }
}

module.exports = ShopifyBindingService;
