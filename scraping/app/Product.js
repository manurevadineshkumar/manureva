const ProductStorage      = require("./storage/ProductStorage");
const MaterialStorage     = require("./storage/MaterialStorage");
const ColorStorage        = require("./storage/ColorStorage");
const ProductImageStorage = require("./storage/ProductImageStorage");
const Brand               = require("./Brand");
const Type                = require("./Type");
const Subtype             = require("./Subtype");

const S3Storage = require("./S3Storage");

class Product {
    constructor(data) {
        this.id = data.id;
        this.ownerId = data.owner_id;
        this.status = data.status;
        this.originalUrl = data.original_url;
        this.gender = data.gender;
        this.type = new Type(data.type);
        this.subtype = data.subtype
            ? new Subtype(data.subtype)
            : null;
        this.model = data.model;
        this.name = data.name;
        this.originalName = data.original_name;
        this.description = data.description;
        this.vendorBoughtPrice = data.vendor_bought_price;
        this.boughtPrice = data.bought_price;
        this.boughtPriceDiscounted = data.bought_price_discounted;
        this.boughtCurrency = data.bought_currency;
        this.purchasePriceCents = data.purchase_price_cents;
        this.wholesalePriceCents = data.wholesale_price_cents;
        this.retailPriceCents = data.retail_price_cents;
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
        this.imageUrls = data.image_urls;
        this.creationDate = new Date(data.creation_date || Date.now());
        this.lastUpdate = new Date(data.last_update || Date.now());
        this.lastScrape = new Date(data.last_scrape || Date.now());
        this.externalIds = data.external_ids;
    }

    get staticUrl() {
        return "https://static.korvin.io/products/"
            + ("" + this.id).padStart(8, "0")
            + "/";
    }

    serialize() {
        return {
            id: this.id,
            owner_id: this.ownerId,
            status: this.status,
            original_url: this.originalUrl,
            gender: this.gender,
            type: this.type.serialize(),
            subtype: this.subtype
                ? this.subtype.serialize()
                : null,
            model: this.model,
            name: this.name,
            original_name: this.originalName,
            description: this.description,
            vendor_bought_price: this.vendorBoughtPrice,
            bought_price: this.boughtPrice,
            bought_price_discounted: this.boughtPriceDiscounted,
            bought_currency: this.boughtCurrency,
            purchase_price_cents: this.purchasePriceCents,
            wholesale_price_cents: this.wholesalePriceCents,
            retail_price_cents: this.retailPriceCents,
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
            last_scrape: +this.lastScrape
        };
    }

    /**
     * Given an array of image uuids, store them as files and assign them to the
     * product
     * @param source_urls {string[]} an array of uuids
     * @return {Promise<void>}
     */
    async storeImages(source_urls) {
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

    async update(data) {
        const {
            image_urls: _,
            colors,
            materials,
            brand: _brand,
            type: type_name,
            subtype: subtype_name,
            ...product_data
        } = data;

        if (type_name) {
            const type = (
                await Type.getByName(type_name)
                || await Type.create(type_name)
            );
            product_data.type_id = type.id;
        }

        if (subtype_name) {
            const subtype = (
                await Subtype.getByName(subtype_name)
                || await Subtype.create(subtype_name)
            );
            product_data.subtype_id = subtype.id;
        }

        const LAST_UPDATE_CHANGING_FIELDS = [
            "owner_id", "status", "name", "brand_id", "type_id", "subtype_id",
            "description", "bought_price", "wholesale_price_cents",
            "retail_price_cents", "grade", "color", "material",
            "has_serial", "has_guarantee_card", "has_box", "has_storage_bag"
        ];

        const new_product = new Product({
            ...product_data,
            id: this.id,
            brand: this.brand.serialize(),
            type: this.type.serialize(),
            subtype: this.subtype?.serialize()
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

        await Promise.all([
            ProductStorage.update(this.id, product_data),
            colors?.length
                ? ColorStorage.setColors(this.id, colors)
                : Promise.resolve(),
            materials?.length
                ? MaterialStorage.setMaterials(this.id, materials)
                : Promise.resolve()
        ]);

        Object.assign(this, new_product);
    }

    static async create(data) {
        const {
            image_urls,
            colors,
            materials,
            brand: brand_name,
            type: type_name,
            subtype: subtype_name,
            ...db_data
        } = data;

        const brand = await Brand.getByName(brand_name)
            || await Brand.create(brand_name);
        db_data.brand_id = brand.id;

        const type = await Type.getByName(type_name)
            || await Type.create(type_name);
        db_data.type_id = type.id;

        const subtype = subtype_name && (
            await Subtype.getByName(subtype_name)
            || await Subtype.create(subtype_name)
        );
        if (subtype)
            db_data.subtype_id = subtype.id;

        const id = await ProductStorage.create(db_data);

        if (!id)
            return null;

        const product = new Product({
            id,
            ...db_data,
            brand: brand.serialize(),
            type: type.serialize(),
            subtype: subtype?.serialize() ?? null
        });

        await Promise.all([
            colors
                ? ColorStorage.setColors(id, colors)
                : Promise.resolve(),
            materials
                ? MaterialStorage.setMaterials(id, materials)
                : Promise.resolve(),
            image_urls
                ? product.storeImages(image_urls)
                : Promise.resolve()
        ]);

        return product;
    }

    static async getByOriginalUrl(original_url) {
        const data = await ProductStorage.getByOriginalUrl(original_url);

        return data ? new Product(data) : null;
    }
}

module.exports = Product;
