const path = require("path");
const crypto = require("crypto");
const Product = require("./Product");

const ProductsGroupStorage = require("../storage/ProductsGroupStorage");
const ProductsBatchIterator = require("../services/BatchListingIterator");

const FilesystemManager = require("../services/FilesystemManager");

if (!process.env.SHARE_GROUP_SECRET)
    throw new Error("Missing SHARE_GROUP_SECRET env var");

class ProductsGroup {
    static SHARE_GROUP_SECRET = process.env.SHARE_GROUP_SECRET;

    constructor(data) {
        this.id = +data.id;
        this.userId = +data.user_id;
        this.productsCount = +data.products_count || 0;
        this.isSystem = !!data.is_system;
        this.lastDump = new Date(data.last_dump);
    }

    get csvFilepath() {
        return path.join(
            FilesystemManager.STATIC_PATH,
            "product-groups",
            "" + this.id
        ) + ".csv";
    }

    get token() {
        const HASH_SECRET = ProductsGroup.SHARE_GROUP_SECRET;

        return crypto.createHash("sha256")
            .update([HASH_SECRET, this.id, this.userId].join(":"))
            .digest("hex")
            .substring(0, 32);
    }

    serialize() {
        return {
            id: +this.id,
            products_count: +this.productsCount,
            share_token: this.token,
            ...(this.isSystem ? {is_system: 1} : {})
        };
    }

    static async getById(id) {
        const data = await ProductsGroupStorage.getById(id);

        return data ? new ProductsGroup(data) : null;
    }

    static async create({user_id, is_system}) {
        const id = await ProductsGroupStorage.create({user_id, is_system});

        return new ProductsGroup({id, user_id, is_system});
    }

    async getProductByExternalId(external_id) {
        return await ProductsGroupStorage.getProductByExternalId(
            this.id,
            external_id
        );
    }

    async addProduct(product, external_id = null, metadata = null) {
        return await ProductsGroupStorage.addProduct(
            this.id, product.id, external_id, metadata
        );
    }

    async addProductIds(product_ids) {
        return await ProductsGroupStorage.addProductIds(this.id, product_ids);
    }

    async removeProduct(product) {
        return await ProductsGroupStorage.removeProduct(this.id, product.id);
    }

    async removeProductIds(product_ids) {
        return await ProductsGroupStorage.removeProductIds(
            this.id,
            product_ids
        );
    }

    async setProductMetadata(product, metadata = null) {
        return await ProductsGroupStorage.setProductMetadata(
            this.id, product.id, metadata
        );
    }

    async update({name}) {
        if (name) {
            await ProductsGroupStorage.update(this.id, {name});
            this.name = name;
        }
    }

    async delete() {
        return await ProductsGroupStorage.delete(this.id);
    }

    async listProducts({prev_id, batch_size}) {
        return await Product.search({group_id: this.id}, prev_id, batch_size);
    }

    iterateProductsBatch({batch_size = 1024}) {
        return new ProductsBatchIterator(
            (prev_id, _) => this.listProducts({prev_id, batch_size})
        );
    }
}

module.exports = ProductsGroup;
