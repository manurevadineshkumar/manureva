const ShopProvider = require("../models/shops/ShopFactory");
const ShopAttribute = require("../models/shops/ShopAttribute");
const ShopBinding = require("../models/shops/ShopBinding");
const Product = require("../models/Product");
const LogChannel = require("../models/LogChannel");

const {PERMISSIONS} = require("../models/Permissions");

const HttpError = require("../errors/HttpError");

const Utils = require("../services/Utils");

const SHOP_PLATFORMS = require("../const/shop-platforms.json");
const ShopExportedProductsService = require("../business-services/shop/ShopExportedProducts.service");
const ProductHelper = require("../business-services/product/helper/Product.helper");
const ShopService = require("../business-services/shop/Shop.service");
const ArrayUtils = require("../services/ArrayUtils");

class Route {
    static listShopPlatforms() {
        return {platforms: SHOP_PLATFORMS};
    }

    /**
     * Fetches the details (currency) of a specific shop.
     * @returns {Promise<{currency: string, original_url: string}}>} The shop details.
     * @throws {HttpError} If the platform is invalid.
     */
    static async fetchShopDetails({query: {platform, url, token, is_exporting}}) {
        if (!SHOP_PLATFORMS[platform]) {
            throw new HttpError(400, `invalid platform: ${platform}`);
        }

        if (is_exporting === "false") {
            is_exporting = false;
        }
        const shopDetails = await ShopService.fetchShopDetails(platform, url, token, is_exporting);
        return shopDetails;
    }

    static async createShop({
        user,
        body: {
            name,
            is_importing,
            is_exporting,
            platform,
            currency,
            url,
            original_url,
            token,
            api_secret,
            day_ranges,
            price_ranges,
            discount_values
        }
    }) {
        const platform_params = SHOP_PLATFORMS[platform];

        if (!platform_params) {
            throw new HttpError(400, "invalid platform");
        }

        if (!platform_params.can_import || !platform_params.can_export) {
            is_importing = !!platform_params.can_import;
            is_exporting = !!platform_params.can_export;
        }

        if (!is_importing && !is_exporting) {
            throw new HttpError(400, "shop must be importing or exporting");
        }

        if (!url || !token) {
            throw new HttpError(400, "shop requires url and token");
        }

        if (ArrayUtils.isAscending(day_ranges) === false) {
            throw new HttpError(400, "day ranges must be in ascending order");
        }

        if (ArrayUtils.isAscending(price_ranges) === false) {
            throw new HttpError(400, "price ranges must be in ascending order");
        }

        if (ArrayUtils.checkValuesInRange(discount_values, 0, 100) === false) {
            throw new HttpError(400, "discount values must be between 0 and 100");
        }

        if (await ShopProvider.getByName(name, user.id)) {
            throw new HttpError(409, "duplicate shop name");
        }

        if (await ShopProvider.getByUrl(url, platform)) {
            throw new HttpError(409, "duplicate shop URL");
        }

        const shop = await ShopProvider.create({
            owner_id: user.id,
            name,
            is_importing,
            is_exporting,
            platform,
            currency,
            url,
            original_url,
            token,
            api_secret,
            day_ranges,
            price_ranges,
            discount_values
        });

        if (process.env.NODE_ENV != "test")
            await Route.#launchShopOperation(user, shop, "setup");

        return shop.serialize();
    }

    static async getShopById({user, path: {id}}) {
        const shop = await ShopProvider.getById(id, user.id);

        if (!shop)
            throw new HttpError(404, "no such shop");

        await shop.loadLogChannels();

        return shop.serialize();
    }

    static async listShopImportedProducts({
        user,
        path: {id},
        query: {prev_id, batch_size}
    }) {
        const shop = await ShopProvider.getById(id, user.id);

        if (!shop)
            throw new HttpError(404, "no such shop");
        if (!shop.isImporting)
            throw new HttpError(400, "import is disabled for this shop");

        return {items: await shop.listImportedProducts(prev_id, batch_size)};
    }

    static async listShopExportedProducts({
        user,
        path: {id},
        query: {prev_id, batch_size}
    }) {
        const shop = await ShopProvider.getById(id, user.id);

        if (!shop)
            throw new HttpError(404, "no such shop");
        if (!shop.isExporting)
            throw new HttpError(400, "export is disabled for this shop");

        return {items: await shop.listExportedProducts(prev_id, batch_size)};
    }

    static async listShops({
        user,
        query: {prev_id, batch_size, is_exporting, is_importing}
    }) {
        const shops = await ShopProvider.listForUser(
            user.id, prev_id, batch_size + 1, {is_exporting, is_importing}
        );

        return {items: shops.map(shop => shop.serialize())};
    }

    static async listShopAttributes({user, path: {id}}) {
        if (!await ShopProvider.getById(id, user.id))
            throw new HttpError(404, "no such shop");

        const attributes = await ShopAttribute.listForShop(id);

        return attributes.map(attr => attr.serialize());
    }

    static async getShopBindings({user, path: {id, category}}) {
        if (!await ShopProvider.getById(id, user.id))
            throw new HttpError(404, "no such shop");

        return await ShopBinding.listForShopByCategory(id, category);
    }

    static async addShopBinding({
        user,
        path: {id, category},
        body: {korvin_id, attribute_value_id}
    }) {
        const shop = await ShopProvider.getById(id, user.id);

        if (!shop)
            throw new HttpError(404, "no such shop");

        if (!await ShopBinding.validateBindingAttribute(
            user.id, category, korvin_id
        ))
            throw new HttpError(404, `no such ${category.slice(0, -1)}`);

        if (!await ShopAttribute.valueIdExists(id, attribute_value_id))
            throw new HttpError(404, `no such attribute`);

        await ShopBinding.addForShop(
            category, korvin_id, id, attribute_value_id
        );

        await shop.update({last_import: null, last_export: null});

        return {success: 1};
    }

    static async deleteShopBinding({
        user,
        path: {id, category},
        body: {korvin_id, attribute_value_id}
    }) {
        const shop = await ShopProvider.getById(id, user.id);

        if (!shop)
            throw new HttpError(404, "no such shop");

        if (!await ShopBinding.validateBindingAttribute(
            user.id, category, korvin_id
        ))
            throw new HttpError(404, `no such ${category.slice(0, -1)}`);

        await ShopBinding.deleteForShop(
            category, korvin_id, id, attribute_value_id
        );

        await shop.update({last_import: null, last_export: null});

        return {success: 1};
    }

    static async addShopExportedProducts({
        user,
        path: {id},
        body: {product_ids}
    }) {
        await user.assertPermission(PERMISSIONS.SHOP_UPDATE);

        const shop = await ShopProvider.getById(id, user.id);

        if (!shop)
            throw new HttpError(404, "no such shop");

        if (!shop.isExporting)
            throw new HttpError(
                400, "products can only be added to exporting shops"
            );

        const remaining = Math.max(
            0,
            shop.exportedSlots - shop.exportedProductsCount
        );

        if (product_ids.length > remaining)
            throw new HttpError(
                400,
                `this shop has ${remaining || "no"} exporting `
                    + `slot${remaining == 1 ? "" : "s"} left`
            );

        let addedProductsCount = 0;
        const archivedProductIds = await ShopExportedProductsService.listArchivedProducts(id);
        if (archivedProductIds.length) {
            /** @type {Array<{product_id: number, external_id?: string}>} */
            const archivedIds = await ShopExportedProductsService.getExternalIds(id, archivedProductIds);

            const archivedProductsToChange = archivedIds
                .filter((archivedId) => archivedId.external_id)
                .map((archivedId) => archivedId.product_id);

            addedProductsCount += await shop.changeExportedProductArchived(archivedProductsToChange, id, 0);
        }
        addedProductsCount += await shop.addExportedProductsByIds(product_ids);

        return {
            success: 1,
            count: addedProductsCount
        };
    }

    static async updateShopExportedProduct({
        user,
        path: {id, product_id},
        body: {exported_price, exported_name, exported_description}
    }) {

        await user.assertPermission(PERMISSIONS.SHOP_UPDATE);

        const shop = await ShopProvider.getById(id, user.id);

        if (!shop)
            throw new HttpError(404, "no such shop");

        if (!shop.isExporting)
            throw new HttpError(
                400, "cannot update product to non-exporting shops"
            );

        const product = await Product.getById(product_id);
        const purchasePriceCents = ProductHelper.getEffectivePurchasePrice(product);

        if (!product)
            throw new HttpError(404, "no such product");

        if (
            exported_price !== undefined
            && exported_price < purchasePriceCents
        )
            throw new HttpError(
                400, "exported price cannot be lower than purchase price"
            );

        await shop.updateExportedProductData(
            product_id,
            Utils.removeUndefinedValues({
                exported_name,
                exported_description,
                exported_price
            })
        );

        return {success: 1};
    }

    static async removeShopExportedProducts({
        user,
        path: {id},
        body: {product_ids}
    }) {
        await user.assertPermission(PERMISSIONS.SHOP_UPDATE);

        const shop = await ShopProvider.getById(id, user.id);

        if (!shop)
            throw new HttpError(404, "no such shop");

        if (!shop.isExporting)
            throw new HttpError(
                400,
                "products can only be added to exporting shops"
            );

        const productIds = [];
        const productIdsToArchive = [];

        /** @type {Array<{product_id: number, external_id?: string}>} */
        const idAndExternalIds = await ShopExportedProductsService.getExternalIds(id, product_ids);
        for (let product of idAndExternalIds) {
            if (product.external_id) {
                productIdsToArchive.push(product.product_id);
            } else {
                productIds.push(product.product_id);
            }
        }

        let nbProductsModified = 0;
        nbProductsModified += await shop.changeExportedProductArchived(productIdsToArchive, id, 1);
        nbProductsModified += await shop.removeExportedProductsByIds(productIds);

        return {
            success: 1,
            count: nbProductsModified
        };
    }

    static async updateShop({
        user,
        path: {id},
        body: {name, is_importing, is_exporting, url, token}
    }) {
        const shop = await ShopProvider.getById(id, user.id);

        if (!shop)
            throw new HttpError(404, "no such shop");

        if (!is_importing && !is_exporting)
            throw new HttpError(400, "shop must be importing or exporting");

        if (
            name
            && name.toLocaleLowerCase() != shop.name.toLocaleLowerCase()
            && await ShopProvider.getByName(name, user.id)
        )
            throw new HttpError(409, "duplicate shop name");
        if (
            url
            && (
                (await ShopProvider.getByUrl(url, shop.platform))?.id ?? shop.id
            ) != shop.id
        )
            throw new HttpError(409, "duplicate shop URL");

        await shop.update({
            name,
            is_importing: !!is_importing,
            is_exporting: !!is_exporting,
            url,
            token
        });

        return shop.serialize();
    }

    static async #launchShopOperation(user, shop, operation) {
        const channel = await LogChannel.create(`shop-${operation}:${shop.id}`);
        const handler = {
            import: shop.importProducts.bind(shop),
            export: shop.exportProducts.bind(shop),
            setup: shop.updateBindings.bind(shop),
        }[operation];

        handler(channel).then(
            () => channel.end(),
            err => {
                console.error(err);
                channel.end();
            }
        );

        return {channel_uuid: channel.uuid};
    }

    static async launchShopSetupSession({user, path: {id}}) {
        await user.assertPermission(PERMISSIONS.SHOP_UPDATE);

        const shop = await ShopProvider.getById(id, user.id);

        if (!shop)
            throw new HttpError(404, "no such shop");

        if (SHOP_PLATFORMS[shop.platform].is_public)
            throw new HttpError(400, "public shops do not require setting up");

        return Route.#launchShopOperation(user, shop, "setup");
    }

    static async launchShopImportSession({user, path: {id}}) {
        await user.assertPermission(PERMISSIONS.SHOP_UPDATE);

        const shop = await ShopProvider.getById(id, user.id);

        if (!shop)
            throw new HttpError(404, "no such shop");

        if (!shop.isImporting)
            throw new HttpError(400, "this shop cannot import products");

        return Route.#launchShopOperation(user, shop, "import");
    }

    static async launchShopExportSession({user, path: {id}}) {
        await user.assertPermission(PERMISSIONS.SHOP_UPDATE);

        const shop = await ShopProvider.getById(id, user.id);

        if (!shop)
            throw new HttpError(404, "no such shop");

        if (!shop.isExporting)
            throw new HttpError(400, "this shop cannot export products");

        return Route.#launchShopOperation(user, shop, "export");
    }

    static async deleteShop({user, path: {id}}) {
        const shop = await ShopProvider.getById(id, user.id);

        if (!shop)
            throw new HttpError(404, "no such shop");

        await shop.delete();

        return {success: 1};
    }
}

module.exports = Route;
