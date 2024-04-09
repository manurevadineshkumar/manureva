class ShopExportedProduct {
    constructor(exportedProduct) {
        this.id = exportedProduct.id;
        this.productId = exportedProduct.product_id;
        this.externalId = exportedProduct.external_id;
        this.exportedName = exportedProduct.exported_name;
        this.exportedDescription = exportedProduct.exported_description;
        this.exportedPrice = exportedProduct.exported_price;
        this.exportedAt = exportedProduct.exported_at;
        this.lastUpdate = exportedProduct.last_update;
    }
}

module.exports = ShopExportedProduct;
