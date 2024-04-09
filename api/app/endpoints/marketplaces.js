const MarketplaceFactory = require(
    "../models/marketplaces/MarketplaceFactory"
);
const ProductsManager = require("../models/ProductsManager");
const Product = require("../models/Product");
const LogChannel = require("../models/LogChannel");

const {PERMISSIONS} = require("../models/Permissions");

const HttpError = require("../errors/HttpError");

const Utils = require("../services/Utils");

const MARKETPLACES_PLATFORMS = require("../const/marketplace-platforms.json");

class Route {
    static listMarketplacePlatforms() {
        return {platforms: MARKETPLACES_PLATFORMS};
    }

    static async listMarketplaceProducts({path: {token}, res}) {
        const [id, expected_token] = token.split(":");

        if (isNaN(+id) || !token)
            throw new HttpError(400, "malformed token");

        const marketplace = await MarketplaceFactory.getById(id, null, true);

        if (!marketplace)
            throw new HttpError(404, "no such marketplace");

        if (marketplace.token != expected_token)
            throw new HttpError(401, "invalid token");

        await marketplace.sendProducts(res);

        return null;
    }

    static #checkRanges(ranges) {
        return ranges.slice(-1)[0].to === null
            && ranges.every(({to}, i) =>
                !i || i == ranges.length - 1 || ranges[i - 1].to < to
            );
    }

    static async createMarketplace({
        user,
        body: {platform, name, ranges}
    }) {
        const platform_params = MARKETPLACES_PLATFORMS[platform];

        if (!platform_params)
            throw new HttpError(400, "invalid platform");

        if (ranges && !Route.#checkRanges(ranges))
            throw new HttpError(400, "invalid ranges");

        const marketplace = await MarketplaceFactory.create({
            owner_id: user.id, platform, name, ranges
        });

        return marketplace.serialize();
    }

    static async getMarketplaceById({user, path: {id}}) {
        const marketplace = await MarketplaceFactory.getById(id, user.id);

        if (!marketplace)
            throw new HttpError(404, "no such marketplace");

        await marketplace.loadLogChannel();

        return marketplace.serialize();
    }

    static async listMarketplaceExportedProducts({
        user,
        path: {id},
        query: {prev_id, batch_size}
    }) {
        const marketplace = await MarketplaceFactory.getById(
            id, user.id
        );

        if (!marketplace)
            throw new HttpError(404, "no such marketplace");

        return {
            items: await marketplace.listExportedProducts(prev_id, batch_size)
        };
    }

    static async listMarketplaces({
        user,
        query: {prev_id, batch_size}
    }) {
        const marketplaces = await MarketplaceFactory.listForUser(
            user.id, prev_id, batch_size + 1
        );

        return {
            items: marketplaces.map(marketplace => marketplace.serialize())
        };
    }

    static async addMarketplaceExportedProducts({
        user,
        path: {id},
        body: {product_ids}
    }) {
        await user.assertPermission(PERMISSIONS.MARKETPLACE_UPDATE);

        const marketplace = await MarketplaceFactory.getById(
            id, user.id
        );

        if (!marketplace)
            throw new HttpError(404, "no such marketplace");

        return {
            count: await marketplace.addExportedProductsByIds(product_ids)
        };
    }

    static async updateMarketplaceExportedProduct({
        user,
        path: {id, product_id},
        body: {exported_name, exported_description}
    }) {
        await user.assertPermission(PERMISSIONS.MARKETPLACE_UPDATE);

        const marketplace = await MarketplaceFactory.getById(
            id, user.id
        );

        if (!marketplace)
            throw new HttpError(404, "no such marketplace");

        const product = await Product.getById(product_id);

        if (!product)
            throw new HttpError(404, "no such product");

        await marketplace.updateExportedProductData(
            product_id,
            Utils.removeUndefinedValues({
                exported_name,
                exported_description
            })
        );

        return {success: 1};
    }

    static async removeMarketplaceExportedProducts({
        user,
        path: {id},
        body: {product_ids}
    }) {
        await user.assertPermission(PERMISSIONS.MARKETPLACE_UPDATE);

        const marketplace = await MarketplaceFactory.getById(
            id, user.id
        );

        if (!marketplace)
            throw new HttpError(404, "no such marketplace");

        return {
            count: await marketplace.removeExportedProductsByIds(product_ids)
        };
    }

    static async updateMarketplace({
        user,
        path: {id},
        body: {name, rotate_token, ranges}
    }) {
        if (ranges && !Route.#checkRanges(ranges))
            throw new HttpError(400, "invalid ranges");

        const marketplace = await MarketplaceFactory.getById(id, user.id);

        if (!marketplace)
            throw new HttpError(404, "no such marketplace");

        await marketplace.update({name, rotate_token, ranges});

        return marketplace.serialize();
    }

    static async launchMarketplaceExportSession({user, path: {id}}) {
        await user.assertPermission(PERMISSIONS.MARKETPLACE_UPDATE);

        const marketplace = await MarketplaceFactory.getById(id, user.id);

        if (!marketplace)
            throw new HttpError(404, "no such marketplace");

        const channel = await LogChannel.create(
            `marketplace-export:${marketplace.id}`
        );

        marketplace.exportProducts(channel).then(
            () => channel.end(),
            err => {
                console.error(err);
                channel.end();
            }
        );

        return {channel_uuid: channel.uuid};
    }

    static async getMarketplaceProductFeed({
        res,
        path: {id},
        query: {token}
    }) {
        const marketplace = await MarketplaceFactory.getById(
            id, null, true
        );

        if (!marketplace)
            throw new HttpError(404, "no such marketplace");

        if (marketplace.token != token)
            throw new HttpError(401, "invalid token");

        res.set("Content-Type", "text/csv");

        const date_str = new Date()
            .toISOString()
            .substring(0, 19)
            .replace("T", " ")
            .replaceAll(":", "-");

        await new Promise(resolve =>
            res.download(
                ProductsManager.DUMP_PATH + `${marketplace.id}.csv`,
                `product-feed ${date_str}.csv`,
                resolve
            )
        );

        return null;
    }

    static async deleteMarketplace({user, path: {id}}) {
        const marketplace = await MarketplaceFactory.getById(id, user.id);

        if (!marketplace)
            throw new HttpError(404, "no such marketplace");

        await marketplace.delete();

        return {success: 1};
    }
}

module.exports = Route;
