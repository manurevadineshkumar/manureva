import {ProductStatusEnum} from "../enums/index";

export default class ProductHelper {

    /**
     * Check wether a product is available for sale
     * @param {Product} product
     * @returns {Boolean}
     */
    static isProductForSale(product) {
        if (product.status === ProductStatusEnum.ACTIVE || product.status === ProductStatusEnum.LOCKED) {
            return true;
        }

        return false;
    }
}
