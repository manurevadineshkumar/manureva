<script>
import DynamicListing from "../../services/DynamicListing";
import ExportedProductPopup from "@/components/popups/ExportedProductPopup.vue";
import Api from "../../services/Api.js";
import ProductHelper from "../../services/ProductHelper.js";

import TooltipText from "../ui/TooltipText.vue";

import {
    ProductArchivedEnum,
    ProductStatusEnum,
} from "../../enums/index.js";

export default {

    data() {
        return {
            ProductStatusEnum,
            ProductHelper
        };
    },

    props: {
        shop: {
            type: Object,
            required: true
        },
        exportedProductsListing: {
            type: DynamicListing,
            required: true
        },
        loading: {
            type: Boolean,
            required: true
        }
    },

    emits: ["delete-exporting-product", "apply-prodcut-price", "callback"],

    computed: {
        updatedShopExportedProduct() {
            return this.exportedProductsListing.items
                .filter((item) => !(item.status === ProductStatusEnum.ACTIVE
                    && item.archived === ProductArchivedEnum.TRUE));
        }
    },

    methods: {

        getExportedProductsCount() {
            return this.exportedProductsListing.items
                .filter((item) => !(item.status === ProductStatusEnum.ACTIVE
                    && item.archived === ProductArchivedEnum.TRUE)).length;
        },

        async editExportedProduct(product) {
            const {id, ...data} = product;
            const {data: {error}} = await Api.updateShopExportedProduct(
                this.shop.id, id, data
            );

            if (error)
                return alert("Error: " + error);

            this.$refs["exported-product-popup"].close();
            const item = this.exportedProductsListing.items.find(
                it => it.id == id
            );

            if (item)
                Object.assign(item, data);
        },
    },

    components: {
        ExportedProductPopup,
        TooltipText
    }
};

</script>
<template>
    <exported-product-popup ref="exported-product-popup" @save="editExportedProduct"/>
    <div class="controls">
        <button
            class="success"
            :disabled="loading"
            @click="$emit('callback')"
        >
            Launch Export
        </button>
    </div>
    <div class="title-section">
        <h1>
            Exported products
        </h1>
        <p>
            Total: {{ getExportedProductsCount() }} /
            {{ shop.exported_slots }}
        </p>
    </div>
    <div ref="listing-header" class="listing-header">
        <div class="row header">
            <div class="col buttons"/>
            <div class="col medium">ID</div>
            <div class="col">Name</div>
            <div class="col">Brand</div>
            <div class="col medium">
                Buying Price EUR &nbsp
                <div>
                    <font-awesome-icon icon="fa-solid fa-circle-question" style="color: var(--light-grey-1);" />
                    <TooltipText
                        text="excl. VAT (if applicable)"
                        location="bottom"
                    />
                </div>
            </div>
            <div class="col medium">
                Exported Price {{ shop.currency }} &nbsp
                <div>
                    <font-awesome-icon icon="fa-solid fa-circle-question" style="color: var(--light-grey-1);" />
                    <TooltipText
                        text="incl. VAT & shipping cost"
                        location="bottom"
                    />
                </div>
            </div>
            <div class="col">
                Earnings &nbsp
                <div>
                    <font-awesome-icon icon="fa-solid fa-circle-question" style="color: var(--light-grey-1);" />
                    <TooltipText
                        text="excl. shipping cost"
                        location="bottom"
                    />
                </div>
            </div>
            <div class="col medium">Estimated Retail Price EUR</div>
        </div>
    </div>
    <transition-group>
        <div
            tag="div"
            name="row"
            ref="listing-items"
            class="listing-items"
            key="exporting-tab"
            @scroll="exportedProductsListing.handleScroll"
        >
            <div
                class="empty-doodle"
                v-if="!exportedProductsListing.isLoading && !exportedProductsListing.items.length"
            />
            <div :class="{}"/>
            <div
                v-for="product in updatedShopExportedProduct"
                :key="product.id"
                class="row"
                :class="{disabled: !ProductHelper.isProductForSale(product)}"
            >
                <div class="col buttons">
                    <button
                        class="mini-button action-delete"
                        @click="$emit('delete-exporting-product', product)"
                    />
                    <button
                        class="mini-button action-edit"
                        @click="() => $refs['exported-product-popup'].open(product)"
                    />
                </div>
                <div class="col medium">
                    <router-link :to="`/product/${+product.id}`">
                        <img
                            class="product-row-image"
                            alt="Product image"
                            :src="product.image_urls[0]"
                        >
                    </router-link>
                    <span v-if="!product.external_id && !product.archived" class="not-exported-tag">
                        Not exported yet
                    </span>
                    <span v-else-if="product.archived && product.status !== ProductStatusEnum.ACTIVE"
                        class="not-exported-tag">
                        Sold Out
                    </span>
                    #{{ product.id }}
                </div>
                <div class="col">
                    {{ product.exported_name }}
                </div>
                <div class="col">
                    {{ product.brand.name }}
                </div>
                <div class="col medium">
                    <input
                        :value="Math.round(product.consignment_price_cents / 100)"
                        class="price-input base"
                        disabled
                    >
                </div>
                <div class="col medium">
                    <input
                        v-model="product.exported_price"
                        type="number"
                        :placeholder="Math.round(product.consignment_price_cents / 100)"
                        class="price-input"
                        :min="Math.round(product.consignment_price_cents / 100)"
                        @keydown.enter="$root.blurActiveElement"
                        @change="$emit('apply-prodcut-price', product)"
                    >
                </div>
                <div class="col">
                    {{ Math.round(product.exported_price - product.consignment_price_cents / 100) }}
                </div>
                <div class="col medium">{{ Math.round(product.suggested_retail_price_cents / 100) }}</div>
            </div>
        </div>
    </transition-group>
</template>
<style>

</style>
