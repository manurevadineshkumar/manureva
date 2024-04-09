<script>
import Api from "../../services/Api.js";

import DynamicListing from "../../services/DynamicListing";

import ProductPopup from "./ProductPopup.vue";
import Popup from "./Popup.vue";

export default {
    computed: {
        Api() {
            return Api;
        },
    },

    data() {
        return {
            session: null,
            productsListing: null,
            showProductPopup: false,
        };
    },

    methods: {
        /**
         * Call the API to get information on all product link to the sessions'
         * id.
         * Create a dynamic listing to display the products.
         * List the first batch of products.
         * Open the listing log product popup.
         * @param {Object} session
         * @returns {Promise<void>}
         */
        async open(session) {
            this.session = session;
            this.productsListing = new DynamicListing(({prev_id, batch_size}) =>
                Api.getProductsBySessionId({
                    id: this.session.id, prev_id, batch_size
                })
            );
            await this.productsListing.listBatch();
            await this.$refs.popup.open();
        },

        /**
         * Change showProductPopup to false in order to come back to the listing log product popup.
         * Close the listing log product popup.
         */
        closePopup() {
            this.showProductPopup = false;
            this.$refs.popup.close();
        },

        /**
         * Change showProductPopup to true in order to open the product popup.
         * Open the product popup in order to display the product details.
         * @param {Object} product
         */
        openProduct(product) {
            this.showProductPopup = true;
            this.$refs.productPopup.openProduct(product);
        },

        /**
         * Change showProductPopup to false in order to come back to the listing log product popup.
         * Close the product popup.
         */
        handleProductPopupClose() {
            this.showProductPopup = false;
        },

    },

    components: {
        Popup,
        ProductPopup,
    },
};
</script>

<template>
    <div>
        <popup ref="popup" class="product-log-popup" v-show="!showProductPopup">
            <h1>{{ session?.name }}</h1>
            <div class="row-listing-container">
                <div class="listing-header">
                    <div class="row header">
                        <div class="col">ID</div>
                        <div class="col">Name</div>
                        <div class="col">Event Type</div>
                        <div class="col">New Price</div>
                    </div>
                </div>
                <div class="listing-items" @scroll="productsListing.onScroll">
                    <div
                        v-for="item in productsListing?.products"
                        class="row"
                        @click="openProduct(item?.product)"
                        :key="item?.product?.id">
                        <div v-if="item?.product?.id" class="col">
                            <img class="product-row-image" alt="Product image" :src="item?.product?.image_urls[0]" />
                            #{{ item?.product?.id }}
                        </div>
                        <div v-if="item?.product?.name" class="col">{{ item?.product?.name }}</div>
                        <div v-if="item?.log?.event_type" class="col">{{ item?.log?.event_type }}</div>
                        <div v-if="item?.log.new_price" class="col">
                            {{ (item?.log?.new_price / 100).toFixed(2) }} €
                        </div>
                    </div>
                </div>
            </div>
            <div class="product-action">
                <button @click="closePopup">Back</button>
            </div>
        </popup>
        <product-popup ref="productPopup" @close="handleProductPopupClose" />
    </div>
</template>

<style>
.product-log-popup {
    display: flex;
    flex-direction: column;
    gap: 20px;
    justify-content: space-between;
    overflow: auto;
    width: 680px;
    max-height: calc(100vh - 80px);
}

.product-log-popup h1 {
    display: flex;
    justify-content: center;
    margin: 0;
}
.product-log-popup .listing-items:not(:empty) {
    border-bottom: 2px solid var(--grey);
}
.product-log-popup .product-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 20%;
}

.product-log-popup .product-actions button {
    margin: 0 10px;
    font-size: 14px;
    padding: 8px;
}
</style>
