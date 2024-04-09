<script>
import DynamicListing from "@/services/DynamicListing.js";
import ProductHelper from "../../services/ProductHelper.js";

export default {
    data() {
        return {
            ProductHelper,
        };
    },

    props: {
        shop: {
            type: Object,
            required: true
        },
        importedProductsListing: {
            type: DynamicListing,
            required: true
        },
        loading: {
            type: Boolean,
            required: true
        }
    },
    emits: ["callback"]
};
</script>

<template>
    <div class="controls">
        <button
            class="success"
            :disabled="loading"
            @click="$emit('callback')"
        >
            Launch Import
        </button>
    </div>
    <div class="title-section">
        <h1>
            Imported products
        </h1>
        <p>
            Total: {{ shop.imported_products_count }}
        </p>
    </div>
    <div ref="listing-header" class="listing-header">
        <div class="row header">
            <div class="col medium">ID</div>
            <div class="col">Name</div>
        </div>
    </div>
    <div ref="listing-items" class="listing-items" @scroll="importedProductsListing.handleScroll">
        <div
            class="empty-doodle"
            v-if="!importedProductsListing.isLoading && !importedProductsListing.items.length"
        />
        <div
            v-for="product in importedProductsListing.items"
            class="row"
            :class="{disabled: !ProductHelper.isProductForSale(product)}"
            :to="`/product/${+product.id}`"
        >
            <div class="col medium">
                <router-link :to="`/product/${+product.id}`"><img
                    class="product-row-image"
                    alt="Product image"
                    :src="product.image_urls[0]"
                ></router-link>
                #{{ product.id }}
            </div>
            <div class="col">
                {{ product.name }}
            </div>
        </div>
    </div>
</template>

<style>
</style>
