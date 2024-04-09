<script>

import Api from "../services/Api";
import TooltipText from "./ui/TooltipText.vue";
import ProductHelper from "../services/ProductHelper.js";

export default {
    data() {
        return {
            ProductHelper,
            index: 0,
        };
    },

    emits: ["select", "open-product"],

    props: {
        product: {
            type: Object,
            required: true
        },
        selected: {
            type: Boolean,
            default: false
        },

    },

    methods: {
        cycleImages(delta) {
            const total = this.product.image_urls.length;

            this.index = (this.index + delta + total) % total;
        },

        /**
         * Formats the product ID and name.
         *
         * @param {string} id - The product ID.
         * @param {string} name - The product name.
         * @returns {string} - The formatted product ID and name.
         */
        formatProductId(id, name) {
            if (!id || !name) return;

            const formattedId = `${id}`.padStart(6, "0");
            const shopifyId = `${name.slice(0,3)}` + "-" + `${formattedId}`;

            return shopifyId;
        },

        userHasPermission(permission) {
            return Api.user?.permissions.has(permission);
        },
        /**
         * Formats the given price.
         * @param {Product} product - The product.
         * @param {string} priceType - The price type to be formatted.
         * @returns {string} The formatted price.
         */
        formatPrices(product, priceType) {
            const discountedPrice = priceType + "_discounted";
            const price = product[discountedPrice] ? product[discountedPrice] : product[priceType];
            return  Math.round(price / 100) + " €";
        },

        /**
         * Calculates the consignment price for a given product.
         *
         * @param {Object} product - The product object for which to calculate the consignment price.
         * @returns {string} - The consignment price for the product.
         */
        displayConsignementPriceInfo(product) {
            return "Dropshipping Price: " + Math.round(product.consignment_price_cents / 100) + "€";
        },
    },

    components: {
        TooltipText
    }
};
</script>

<template>
    <div class="product-card"
        :class="{unavailable: !ProductHelper.isProductForSale(product)}"
        @click="e => $emit('open-product', e)">
        <div class="card-image-body">
            <transition-group tag="div" class="card-image">
                <template v-for="(url, i) in product?.image_urls" :key="i">
                    <div
                        v-if="i == this.index"
                        :class="'c-' + i"
                        :style="{'background': `center / contain no-repeat url(${url})`}"
                    />
                </template>
            </transition-group>
            <button
                class="card-image-button previous-button"
                @click.stop="() => cycleImages(-1)"
            />
            <button
                class="card-image-button next-button"
                @click.stop="() => cycleImages(1)"
            />
        </div>
        <input
            type="checkbox"
            class="product-card-checkbox"
            :checked="selected"
            @click.prevent="e => $emit('select', e.shiftKey)"
        >
        <div class="product-card-description">
            <div class="card-category product-card-id">
                {{ formatProductId(product?.id, product?.brand.name) }}
            </div>
            <div class="card-category product-card-brand">
                {{ product?.brand.name.toUpperCase() }}
            </div>
            <div class="product-card-separator"></div>
            <div class="card-category product-card-prices">
                <div v-if="!isNaN(product?.purchase_price_cents)"
                    class="product-card-price">
                    <label>Purchase price</label>
                    <div class="product-price">
                        {{ formatPrices(product, "purchase_price_cents") }}
                    </div>
                </div>
                <div v-if="!isNaN(product?.wholesale_price_cents)"
                    class="product-card-price">
                    <label v-if="userHasPermission('ADMIN')">Wholesale price</label>
                    <div class="product-price d-flex flex-row ga-2">
                        {{ formatPrices(product, "wholesale_price_cents") }}
                        <div v-if="userHasPermission('PRODUCT_SHOW_CONSIGNMENT_PRICE')">
                            <font-awesome-icon icon="fa-solid fa-circle-info" style="color: var(--light-grey-1);" />
                            <TooltipText
                                    :text="displayConsignementPriceInfo(product)"
                                    location="bottom"
                            />
                        </div>
                    </div>
                </div>
                <div v-if="!isNaN(product?.retail_price_cents)"
                    class="product-card-price">
                    <label>Retail price</label>
                    <div class="product-price">
                        {{ formatPrices(product, "retail_price_cents") }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
.product-card {
    position: relative;
    display: flex;
    flex-direction: column;
    background: var(--white-color);
    color: var(--black-grey);
    width: 250px;
    padding-top: 20px;
    cursor: pointer;
    transition: transform 0.2s ease-in-out;
    border-bottom: 1px solid var(--light-grey-0);
    border-radius: 0px;
}

.product-card:hover {
    border: 1px solid var(--light-grey-0);
    border-radius: 8px;
}

.product-card.unavailable {
    opacity: .4;
}

.product-card .product-card-description {
    flex: 1;
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 8px;
    margin: 10px;
}

.product-card .product-card-checkbox {
    position: absolute;
    top: 15px;
    left: 15px;
    border-radius: 20px;
    background-color: var(--white-color);
    background-size: 80%;
}

.product-card input.product-card-checkbox:checked {
    background-position: 2px 2px;
}

.card-image-body {
    position: relative;
}
.product-card .card-image {
    position: relative;
    display: block;
    height: 230px;
    width: 230px;
    margin: 0 auto;
    border-radius: 5px;
    background: var(--white-color);
    overflow: hidden;
}
.product-card .card-image > div {
    position: absolute;
    height: 100%;
    width: 100%;
    background-size: 110%;
    background-position: center;
    transition: all .2s ease-in-out;
}
.product-card:hover .card-image > div {
    background-size: 100%
}
.product-card .card-image > div.v-enter-from {
    opacity: 0;
    transform: scale(1.2);
}
.product-card .card-image-button {
    visibility: collapse;
    position: absolute;
    width: 30px;
    height: 30px;
    bottom: 45%;
    padding: 0;
    background: var(--white-color) no-repeat center;
    background-size: 70%;
    border: none;
    opacity: 0;
    transition: all .15s ease-in-out;
}

.product-card .card-image-button.previous-button {
    background-image: url("/icons/arrow-left.svg");
    left: -10px;
}
.product-card .card-image-button.next-button {
    background-image: url("/icons/arrow-right.svg");
    right: -10px;
}
.product-card:hover .card-image-button {
    visibility: visible;
    opacity: 1;
}
.product-card:hover .card-image-button.previous-button {
    left: -20px;
}
.product-card:hover .card-image-button.next-button {
    right: -20px;
}

.product-card .product-card-id {
    white-space: nowrap;
    font-family: monospace;
    font-size: 12px;
    opacity: .75;
}

.product-card .product-card-brand {
    font-family: Avenue_Mono;
    font-size: 14px;
}

.product-card .product-card-prices {
    margin-top: auto;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    width: 70%;
    gap: 5px;
}
.product-card .product-card-price {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 5px;
    font-size: 18px;
}

.product-card .product-card-price label {
    font-size: 14px;
}

.product-card .product-card-separator {
    border-bottom: 1px solid var(--light-grey-0);
    width: 250px;
}

.product-card .product-card-price .product-price {
    position: relative;
    cursor: pointer;
}

</style>
