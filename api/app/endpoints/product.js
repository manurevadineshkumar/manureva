const Product = require("../models/Product");
const Brand = require("../models/Brand");
const Type = require("../models/Type");
const Subtype = require("../models/Subtype");
const ShopProvider = require("../models/shops/ShopFactory");

const {PERMISSIONS} = require("../models/Permissions");

const HttpError = require("../errors/HttpError");

class Route {
    static async getProductById({user, path: {id}}) {
        await user.assertPermission(PERMISSIONS.PRODUCT_LIST);

        const product = await Product.getById(id);

        if (!product)
            throw new HttpError(404, "no such product");

        return {product: await product.serializeForUser(user)};
    }

    static async #getProductEntities({brand_id, type_id, subtype_id}) {
        const [brand, type, subtype] = await Promise.all([
            brand_id && await Brand.getById(brand_id),
            type_id && await Type.getById(type_id),
            subtype_id && await Subtype.getById(subtype_id)
        ]);

        if (brand_id && !brand)
            throw new HttpError(404, `no brand with id ${brand_id}`);
        if (type_id && !type)
            throw new HttpError(404, `no type with id ${type_id}`);
        if (subtype_id && !subtype)
            throw new HttpError(404, `no subtype with id ${subtype_id}`);

        return {brand, type, subtype};
    }

    static async getProductsFromCollectionsTags( {query: {tag_id, prev_id, batch_size}}) {
        const res = await Product.search({tag_ids: tag_id}, prev_id, batch_size);

        const products = res.map((product) => {
            return {image: product.imageUrls[0], brand: product.brand.name};
        });

        // const products = [];
        // res.forEach((product) => {
        //     const info = [{image: product.imageUrls[0], brand: product.brand.name}];
        //     products.push(info);
        // });
        return products;
    }

    static async updateProductById({
        user,
        path: {id},
        body: data
    }) {
        await user.assertPermission(PERMISSIONS.PRODUCT_UPDATE);

        if (data.status)
            await user.assertPermission(PERMISSIONS.PRODUCT_EDIT_STATUS);

        const {brand, type, subtype} = await Route.#getProductEntities(data);

        const product = await Product.getById(id);

        if (!product)
            throw new HttpError(404, `no such product for id: ${id}`);

        await product.update(data, brand, type, subtype);

        return {product: await product.serializeForUser(user)};
    }

    static async updateProductTags({
        user,
        path: {id},
        body: {tag_ids}
    }) {
        await user.assertPermission(PERMISSIONS.PRODUCT_TAGS_UPDATE);

        const product = await Product.getById(id);

        if (!product)
            throw new HttpError(404, `no such product`);

        await product.update({tag_ids});

        return {product: await product.serializeForUser(user)};
    }

    static #buildFilters(filters, user = null) {
        filters.user_id = user.id;

        if (filters.keywords)
            filters.keywords = filters.keywords.split(" ");

        if (filters.available !== null)
            filters.available = !!filters.available;

        [
            "color_ids",
            "material_ids",
            "tag_ids",
            "brand_ids",
            "type_ids",
            "subtype_ids",
            "country_ids"
        ].forEach(name => {
            if (filters[name]) {
                filters[name] = filters[name].split("-").map(n => +n);

                if (filters[name].some(isNaN))
                    throw new HttpError(400, "invalid filter format");
            }
        });

        if (filters.own_only) {
            delete filters.own_only;
            filters.owner_id = user?.id;
        }

        return filters;
    }

    static async searchProducts({
        user,
        query: {prev_id, batch_size, shop_id, ...filters}
    }) {
        await user.assertPermission(PERMISSIONS.PRODUCT_LIST);

        const shop = shop_id
            ? await ShopProvider.getById(shop_id, user.id)
            : null;

        if (shop_id && !shop)
            throw new HttpError(404, "no such shop");

        if (shop)
            filters.shop_id = shop_id;

        const products = await Product.search(
            Route.#buildFilters(filters, user),
            prev_id, batch_size + 1
        );

        const items = await Promise.all(
            products
                .slice(0, batch_size)
                .map(async product => await product.serializeForUser(user))
        );

        return {
            items,
            ...(products.length < batch_size + 1 ? {is_last_batch: 1} : {})
        };
    }

    static async createProduct({user, body: data}) {
        await user.assertPermission(PERMISSIONS.PRODUCT_CREATE);

        data = {...data, owner_id: user.id};
        const {brand, type, subtype} = await Route.#getProductEntities(data);

        const product = await Product.create(data, brand, type, subtype);

        return {product: await product.serializeForUser(user)};
    }

    static async createProductImages({user, path: {id}, files: {images}}) {
        await user.assertPermission(PERMISSIONS.PRODUCT_IMAGE_UPLOAD);

        const product = await Product.getById(id);

        if (!product)
            throw new HttpError(404, "no such product");

        return {uuids: await product.addImagesToProduct(images)};
    }

    static async deleteProductImage({user, path: {id}, body: {uuids}}) {
        await user.assertPermission(PERMISSIONS.PRODUCT_IMAGE_DELETE);

        const product = await Product.getById(id);

        if (!product)
            throw new HttpError(404, "no such product");

        return {uuids: await product.deleteImagesFromProduct(uuids)};
    }

    static async getStatusStatistics({user}) {
        await user.assertPermission(PERMISSIONS.ADMIN);

        const count = await Product.getStatusStatistics();

        return Object.fromEntries(count.map(
            ({status, count}) => [status, count]
        ));
    }
}

module.exports = Route;
