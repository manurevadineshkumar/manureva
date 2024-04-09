const ProductStorage = require("../storage/ProductStorage");
const ColorStorage = require("../storage/ColorStorage");
const MaterialStorage = require("../storage/MaterialStorage");
const ExternalIdsStorage = require("../storage/ExternalIdsStorage");
const ProductImageStorage = require("../storage/ProductImageStorage");
const TagStorage = require("../storage/TagStorage");

const Brand = require("./Brand");
const Type = require("./Type");
const Subtype = require("./Subtype");

const FilesystemManager = require("../services/FilesystemManager");
const S3Storage = require("../services/S3Storage");
const Mime = require("../services/Mime");

const {PERMISSIONS} = require("../models/Permissions");

const RESTRICTED_PROPS = [
    {
        prop: "bought_price",
        permission: PERMISSIONS.PRODUCT_SHOW_BOUGHT_PRICE
    },
    {
        prop: "bought_price_discounted",
        permission: PERMISSIONS.PRODUCT_SHOW_BOUGHT_PRICE
    },
    {
        prop: "purchase_price_cents",
        permission: PERMISSIONS.PRODUCT_SHOW_PURCHASE_PRICE
    },
    {
        prop: "purchase_price_cents_discounted",
        permission: PERMISSIONS.PRODUCT_SHOW_PURCHASE_PRICE
    },
    {
        prop: "wholesale_price_cents",
        permission: PERMISSIONS.PRODUCT_SHOW_WHOLESALE_PRICE
    },
    {
        prop: "wholesale_price_cents_discounted",
        permission: PERMISSIONS.PRODUCT_SHOW_WHOLESALE_PRICE
    },
    {
        prop: "consignment_price_cents",
        permission: PERMISSIONS.PRODUCT_SHOW_CONSIGNMENT_PRICE
    },
    {
        prop: "retail_price_cents",
        permission: PERMISSIONS.PRODUCT_SHOW_RETAIL_PRICE
    },
    {
        prop: "retail_price_cents_discounted",
        permission: PERMISSIONS.PRODUCT_SHOW_RETAIL_PRICE
    },
    {
        prop: "vendor",
        permission: PERMISSIONS.ADMIN
    },
    {
        prop: "original_url",
        permission: PERMISSIONS.ADMIN
    },
    {
        prop: "original_name",
        permission: PERMISSIONS.ADMIN
    }
];

class Product {

    /**
     * The rate used to calculate the dropshipping price from the wholesale price .
     * @type {number}
     */
    static WHOLESALE_TO_DROPSHIPPING_RATE = 1.30;

    constructor(data) {
        this.id = data.id;
        this.ownerId = data.owner_id;
        this.status = data.status;
        this.isExportable = data.is_exportable;
        this.originalUrl = data.original_url;
        this.gender = data.gender;
        this.type = new Type(data.type);
        this.subtype = data.subtype
            ? new Subtype(data.subtype)
            : null;
        this.model = data.model;
        this.vendor = data.vendor;
        this.name = data.name;
        this.originalName = data.original_name;
        this.description = data.description;
        this.vendorBoughtPrice = data.vendor_bought_price;
        this.boughtPrice = data.bought_price;
        this.boughtPriceDiscounted = data.bought_price_discounted;
        this.boughtCurrency = data.bought_currency;
        this.purchasePriceCents = data.purchase_price_cents;
        this.purchasePriceCentsDiscounted = data.purchase_price_cents_discounted;
        this.wholesalePriceCents = data.wholesale_price_cents;
        this.wholesalePriceCentsDiscounted = data.wholesale_price_cents_discounted;
        this.retailPriceCents = data.retail_price_cents;
        this.retailPriceCentsDiscounted = data.retail_price_cents_discounted;
        this.grade = data.grade;
        this.brand = new Brand(data.brand);
        this.size = data.size;
        this.colors = data.colors;
        this.materials = data.materials;
        this.tags = data.tags;
        this.hasSerial = !!data.has_serial;
        this.hasGuaranteeCard = !!data.has_guarantee_card;
        this.hasBox = !!data.has_box;
        this.hasStorageBag = !!data.has_storage_bag;
        this.isExportedVc = data.is_exported_vc;
        this.imageUrls = data.image_urls?.map(
            url => S3Storage.OVH_S3_ENDPOINT + "/" + url
        ) || [];
        this.creationDate = new Date(data.creation_date || Date.now());
        this.lastUpdate = new Date(data.last_update || Date.now());
        this.lastScrape = new Date(data.last_scrape || Date.now());
        this.externalIds = data.external_ids;
    }

    /**
     * A pretty-formatted string containing the product id and its brand,
     * e.g. "CHA-000001"
     * @returns {string}
     */
    get identifier() {
        return (this.brand.name.substring(0, 3) || "KOR")
            + "-"
            + ("" + this.id).padStart(6, "0");
    }

    /**
     * The base static URL of the product
     * @returns {string}
     */
    get staticUrl() {
        return "https://static.korvin.io/products/"
            + ("" + this.id).padStart(8, "0")
            + "/";
    }

    /**
     * The base static URL of the product
     * @returns {string}
     */
    get staticPath() {
        return FilesystemManager.STATIC_PATH
            + "products/"
            + ("" + this.id).padStart(8, "0")
            + "/";
    }

    /**
     * Get the consignment price in cents.
     * @returns {number|null} The consignment price in cents, or null if the wholesale price is not available.
     */
    get consignmentPriceCents() {
        const wholesalePriceCents = this.wholesalePriceCentsDiscounted
            ? this.wholesalePriceCentsDiscounted
            : this.wholesalePriceCents;

        return (wholesalePriceCents ?? null) === null
            ? null
            : wholesalePriceCents * Product.WHOLESALE_TO_DROPSHIPPING_RATE;
    }

    /**
     * Returns an object serialization of the product for a user
     * @param user {User}
     * @returns {Object}
     */
    async serializeForUser(user) {
        const data = this.serialize();

        for (const {prop, permission} of RESTRICTED_PROPS) {
            if (!await user?.hasPermission(permission))
                delete data[prop];
        }

        if (data.tags) {
            const tag_ids = new Set(
                await TagStorage.filterForUser(
                    Object.keys(data.tags).map(Number),
                    this.ownerId
                )
            );

            data.tags = Object.fromEntries(
                Object.entries(data.tags)
                    .filter(([id, _]) => tag_ids.has(+id))
            );
        }

        return data;
    }

    /**
     * Returns a full object serialization of the product
     * @returns {Object}
     */
    serialize() {
        return {
            id: this.id,
            owner_id: this.ownerId,
            status: this.status,
            is_exportable: this.isExportable,
            original_url: this.originalUrl,
            gender: this.gender,
            type: this.type.serialize(),
            subtype: this.subtype && this.subtype.serialize(),
            vendor: this.vendor,
            model: this.model,
            name: this.name,
            original_name: this.originalName,
            description: this.description,
            vendor_bought_price: this.vendorBoughtPrice,
            bought_price: this.boughtPrice,
            bought_price_discounted: this.boughtPriceDiscounted,
            bought_currency: this.boughtCurrency,
            purchase_price_cents: this.purchasePriceCents,
            purchase_price_cents_discounted: this.purchasePriceCentsDiscounted,
            wholesale_price_cents: this.wholesalePriceCents,
            wholesale_price_cents_discounted: this.wholesalePriceCentsDiscounted,
            consignment_price_cents: this.consignmentPriceCents,
            retail_price_cents: this.retailPriceCents,
            retail_price_cents_discounted: this.retailPriceCentsDiscounted,
            grade: this.grade,
            brand: this.brand.serialize(),
            size: this.size,
            colors: this.colors,
            materials: this.materials,
            tags: this.tags,
            has_serial: +this.hasSerial,
            has_guarantee_card: +this.hasGuaranteeCard,
            has_box: +this.hasBox,
            has_storage_bag: +this.hasStorageBag,
            is_exported_vc: +this.isExportedVc,
            image_urls: this.imageUrls,
            creation_date: +this.creationDate,
            last_update: +this.lastUpdate,
            last_scrape: +this.lastScrape,
        };
    }

    /**
     * Returns a reduced object serialization of the product for Offline view
     * @returns {Object}
     */
    serializePublic() {
        return {
            id: this.id,
            status: this.status,
            image_urls: this.imageUrls,
            name: this.name,
            brand: this.brand?.serialize(),
            model: this.model,
            type: this.type?.serialize(),
            subtype: this.subtype?.serialize(),
            grade: this.grade,
            size: this.size,
            colors: this.colors,
            materials: this.materials,
            has_serial: this.hasSerial,
            has_guarantee_card: this.hasGuaranteeCard,
            has_box: this.hasBox,
            has_storage_bag: this.hasStorageBag,
            wholesale_price_cents: this.wholesalePriceCents,
            wholesale_price_cents_discounted: this.wholesalePriceCentsDiscounted,
        };
    }

    /**
     * Generates a verbose description string for the product based on its
     * properties
     * @returns {string}
     */
    getVerboseDescription() {
        function getTagSentence(is_included, name) {
            return is_included ? `Includes ${name}` : "";
        }

        function getSizeSentence(size) {
            if (!size) {
                return [""];
            }
            return Object.entries(size).map(([k, v]) => `${k}: ${v}`);
        }

        return [
            "Grade: " + (this.grade[0] || "B"),
            ...getSizeSentence(this.size),
            getTagSentence(this.hasSerial, "a serial number"),
            getTagSentence(this.hasGuaranteeCard, "a guarantee card"),
            getTagSentence(this.hasBox, "its original box"),
            getTagSentence(this.hasStorageBag, "an original dust bag")
        ].filter(Boolean).join("\n");
    }

    /**
     * Update a product with given data, brand, type and subtype
     * @param data {Object}
     * @param brand {?Brand}
     * @param type {?Type}
     * @param subtype {?Subtype}
     * @returns {Promise<void>}
     */
    async update(data, brand = null, type = null, subtype = null) {
        const {
            image_urls, color_ids, material_ids, tag_ids,
            ...product_data
        } = data;
        const LAST_UPDATE_CHANGING_FIELDS = [
            "status", "name", "description", "bought_price",
            "wholesale_price_cents", "retail_price_cents", "grade",
            "color", "material", "has_serial", "has_guarantee_card",
            "has_box", "has_storage_bag", "type_id", "subtype_id", "brand"
        ];

        const new_product = new Product({
            ...product_data,
            id: this.id,
            brand: (brand || this.brand).serialize(),
            type: (type || this.type).serialize(),
            subtype: (subtype || this.subtype)?.serialize()
        });

        const current_fields = this.serialize();
        const new_fields = new_product.serialize();

        if (LAST_UPDATE_CHANGING_FIELDS.some(name =>
            data[name] !== undefined
            && new_fields[name] !== current_fields[name]
        )) {
            const now = new Date;

            product_data.last_update = now;
            new_product.lastUpdate = now;
        }

        Object.keys(product_data).forEach(name => {
            if (product_data[name] === undefined) {
                delete product_data[name];
            }
        });

        await Promise.all([
            ProductStorage?.update(this.id, product_data),
            color_ids
                ? ColorStorage.setColorsByIds(this.id, color_ids)
                : Promise.resolve(),
            material_ids
                ? MaterialStorage.setMaterialsByIds(this.id, material_ids)
                : Promise.resolve(),
            tag_ids
                ? TagStorage.setProductTagsByIds(this.id, tag_ids)
                : Promise.resolve()
        ]);

        Object.assign(this, new_product);
    }

    /**
     * Set an external service id for the given product
     * @param service_name {string}
     * @param external_id {string | null}
     * @returns {Promise<void>}
     */
    async setExternalServiceId(service_name, external_id) {
        await ExternalIdsStorage.setExternalId(
            this.id, service_name, external_id
        );

        this.externalIds[service_name] = external_id;
    }

    /**
     * Mark product ids as available
     * @param ids {number[]}
     * @returns {Promise<number>}
     */
    static async setAvailableBatch(ids) {
        return await ProductStorage.setAvailableBatch(ids);
    }

    /**
     * Mark products not updated since `min_timestamp` as unavailable
     * @param min_timestamp {Date}
     * @returns {Promise<number>}
     */
    static async deprecateAvailability(min_timestamp) {
        return await ProductStorage.deprecateAvailability(min_timestamp);
    }

    /**
     * Get a product by id, or return null
     * @deprecated use ProductService.getById() instead
     * @param id {number}
     * @returns {Promise<?Product>}
     */
    static async getById(id) {
        const data = await ProductStorage.getById(id);

        return data ? new Product(data) : null;
    }

    /**
     * Get a product by its external ID in a shop, or return null
     * @param shop_id {Number}
     * @param external_id {String}
     * @returns {Promise<?Product>}
     */
    static async getByShopExternalId(shop_id, external_id) {
        const data = await ProductStorage.getByShopExternalId(
            shop_id, external_id
        );

        return data ? new Product(data) : null;
    }

    /**
     * Count all existing products
     * @returns {Promise<number>}
     */
    static async countAll() {
        return await ProductStorage.countAll();
    }

    /**
     * Get status statistics for all products
     * @returns {Promise<Object>} an object with statuses as keys and the amount
     *  of products with given statuses as values
     */
    static async getStatusStatistics() {
        return await ProductStorage.getStatusStatistics();
    }

    /**
     * List at most `limit` products after `prev_id`
     * @param prev_id
     * @param limit
     * @returns {Promise<Product[]>}
     */
    static async listAll(prev_id = 0, limit = 1024) {
        return (
            await ProductStorage.listAll(prev_id, limit)
        ).map(data => new Product(data));
    }

    /**
     * Count available products
     * @returns {Promise<number>}
     */
    static async countAvailable() {
        return await ProductStorage.countAvailable();
    }

    /**
     * List at most `limit` available products after `prev_id`
     * @param prev_id
     * @param limit
     * @returns {Promise<Product[]>}
     */
    static async listAvailable(prev_id = 0, limit = 1024) {
        return (
            await ProductStorage.listAvailable(prev_id, limit)
        ).map(data => new Product(data));
    }

    /**
     * Count how many products have been updated for a given service
     * @param service_name {string}
     * @param filters {Object}
     * @returns {Promise<number>}
     */
    static async countUpdatedForService(service_name, filters) {
        return await ProductStorage.countUpdatedForService(
            service_name, filters
        );
    }

    /**
     * Get at most `limit` products updated for a given service after `prev_id`
     * @param service_name {string}
     * @param filters {Object}
     * @param prev_id {number}
     * @param limit {number}
     * @returns {Promise<Product[]>}
     */
    static async listUpdatedForService(
        service_name, filters, prev_id = 0, limit = 1024
    ) {
        return (
            await ProductStorage.listUpdatedForService(
                service_name, filters, prev_id, limit
            )
        ).map(data => new Product(data));
    }

    /**
     * Count how many products match specified `filters`
     * @param filters {Object}
     * @returns {Promise<Number>}
     */
    static async countSearch(filters) {
        return await ProductStorage.countSearch(filters);
    }

    /**
     * List at most `batch_size` products after `prev_id` with given `filters`
     * @param filters {Object}
     * @param prev_id {number}
     * @param batch_size {number}
     * @returns {Promise<Product[]>}
     */
    static async search(filters, prev_id, batch_size) {
        const products = await ProductStorage.search(
            filters, prev_id, batch_size
        );

        return products.map(data => new Product(data));
    }

    /**
     * Given an array of image files, add them to the product
     * @param images {Object[]} an array of images
     * @returns {Promise<string[]>} an array of urls of the uploaded images
     */
    async addImagesToProduct(images) {
        const uploadedImages = await Promise.all(images.map(
            async (image) => {
                const {uuid} = await S3Storage.upload(
                    image.buffer,
                    Mime.validateMime(image.mimetype),
                );
                return {source_url: null, uuid};
            }
        ));

        await ProductImageStorage.addImages(this.id, uploadedImages);

        return uploadedImages.map(url => url.uuid);
    }

    /**
     * Given an array of image uuids, store them as files and assign them to the
     * product
     * @param source_urls {string[]} an array of uuids
     * @return {Promise<void>}
     */
    async storeImages(source_urls) {
        if (process.env.NODE_ENV == "test") {
            console.info({source_urls});
            console.info("Skipping image storage in test environment");
            return;
        }

        const images = (await ProductImageStorage.getImagesById(this.id)).map(
            ({uuid}) => uuid
        );

        await S3Storage.delete(images);
        await ProductImageStorage.removeImages(this.id);

        for (const url of source_urls) {
            const {uuid} = await S3Storage.uploadFromUrl(url);
            await ProductImageStorage.addImages(
                this.id,
                [{source_url: url, uuid}]
            );
        }
    }

    /**
     * Given an array of image urls, remove them from the product
     * @param uuids {string[]} an array of uuids
     * @returns {Promise<string[]>} an array of product image uuids after
     *  deletion
     */
    async deleteImagesFromProduct(uuids) {
        await S3Storage.delete([
            ...uuids,
            ...uuids.map(uuid => `u2net/${uuid}`),
            ...uuids.map(uuid => `u2netp/${uuid}`)
        ]);

        await ProductImageStorage.deleteImagesByUuids(this.id, uuids);

        return (
            await ProductImageStorage.getImagesById(this.id)
        ).map(url => url.uuid);
    }

    /**
     * Create a product with given data, brand, type and subtype
     * @deprecated use ProductService.create instead
     * @param data {Object}
     * @param brand {Brand}
     * @param type {Type}
     * @param subtype {Subtype}
     * @returns {Promise<Product>}
     */
    static async create(data, brand, type, subtype = null) {
        data.brand_id = brand.id;
        data.type_id = type.id;
        data.subtype_id = subtype?.id || null;

        const {image_bytes, color_ids, material_ids, ...db_data} = data;

        const id = await ProductStorage.create({
            ...db_data, brand_id: brand.id
        });

        if (!id)
            return null;

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
}

module.exports = Product;
