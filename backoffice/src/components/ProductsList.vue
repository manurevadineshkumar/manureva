<script>
import Api from "../services/Api.js";
import DynamicListing from "../services/DynamicListing.js";

import Dropdown from "./dropdowns/Dropdown.vue";
import DynamicDropdown from "./dropdowns/DynamicDropdown.vue";
import ProductCard from "./ProductCard.vue";
import FilterBar from "./FilterBar.vue";
import Popup from "./popups/Popup.vue";
import BulkActionsDropdown from "./BulkActionsDropdown.vue";
import TooltipText from "./ui/TooltipText.vue";

export default {
    emits: [
        "select-product",
        "open-product",
        "batch-loaded",
        "do-product-action"
    ],

    props: {
        columns: {
            type: String,
            default: "id name"
        },
        bulkActions: {
            type: String,
            default: ""
        },
        extraBulkActions: {
            type: Array,
            default: []
        },
        extraFilters: {
            type: Object,
            default: {}
        },
        actions: {
            type: String,
            default: ""
        },
        gridView: {
            type: Boolean,
            default: true
        },
        hideFilters: {
            type: Boolean,
            default: false
        },
        listingFunction: {
            type: Function,
            default: Api.searchProducts
        },
        defaultStatus: {
            type: String,
            default: "ACTIVE"
        }
    },

    data() {
        return {
            columnsSet: new Set(this.columns.split(" ")),
            actionsList: this.actions ? this.actions.split(" ") : [],
            currentProduct: null,
            currentProductIdx: -1,
            listing: new DynamicListing(
                ({prev_id, batch_size}) => this.listingFunction({
                    filters: this.appliedFilters,
                    prev_id,
                    batch_size
                }),
                {
                    listing_callback: () => { this.$emit("batch-loaded"); }
                }
            ),
            searchTimeout: null,
            filterValues: {
                id: null,
                keywords: null,
                status: this.defaultStatus === "ANY" ? null : this.defaultStatus,
                brand_ids: [],
                color_ids: [],
                material_ids: [],
                tag_ids: [],
                type_ids: [],
                subtype_ids: [],
                country_ids: [],
                priceFrom: null,
                priceTo: null,
                wholesalePriceFrom: null,
                wholesalePriceTo: null,
                boughtPriceFrom: null,
                boughtPriceTo: null,
                discountPercentFrom: null,
                discountPercentTo: null,
                createdFrom: null,
                createdTo: null,
                hasSerial: false,
                hasGuaranteeCard: false,
                hasDustBag: false,
                hasBox: false,
                grade: null,
                model: null
            },
            isCreatingProduct: false,
            reduceFilters: true,
            selectedProductIds: new Set(),
            lastSelectedId: 0,
        };
    },

    computed: {
        products() {
            return this.listing.items;
        },

        appliedFilters() {
            return {
                id: this.filterValues.id || null,
                keywords: this.filterValues.keywords || null,
                status: this.filterValues.status,
                brand_ids: this.filterValues.brand_ids,
                color_ids: this.filterValues.color_ids,
                material_ids: this.filterValues.material_ids,
                tag_ids: this.filterValues.tag_ids,
                type_ids: this.filterValues.type_ids,
                subtype_ids: this.filterValues.subtype_ids,
                country_ids: this.filterValues.country_ids.map(it => it.id),
                price_from: this.filterValues.priceFrom * 100 || null,
                price_to: this.filterValues.priceTo * 100 || null,
                wholesale_price_from: this.filterValues.wholesalePriceFrom * 100 || null,
                wholesale_price_to: this.filterValues.wholesalePriceTo * 100 || null,
                bought_price_from: this.filterValues.boughtPriceFrom * 100 || null,
                bought_price_to: this.filterValues.boughtPriceTo * 100 || null,
                discount_percent_from: this.filterValues.discountPercentFrom || null,
                discount_percent_to: this.filterValues.discountPercentTo || null,
                created_from: this.filterValues.createdFrom
                    ? +new Date(this.filterValues.createdFrom)
                    : null,
                created_to: this.filterValues.createdTo
                    ? +new Date(this.filterValues.createdTo)
                    : null,
                has_serial: this.filterValues.hasSerial ? 1 : null,
                has_guarantee_card: this.filterValues.hasGuaranteeCard ? 1 : null,
                has_storage_bag: this.filterValues.hasDustBag ? 1 : null,
                has_box: this.filterValues.hasBox ? 1 : null,
                grade: this.filterValues.grade || null,
                model: this.filterValues.model || null,
                ...this.extraFilters
            };
        },

        selectedProducts() {
            return this.products.filter(({id}) =>
                this.selectedProductIds.has(id)
            );
        }
    },

    mounted() {
        window.addEventListener("keydown", e => {
            if (!this.currentProduct || this.isCreatingProduct)
                return;

            if (e.key == "Escape") {
                this.openProduct(null);
                return e.preventDefault();
            }
            if (e.key == "ArrowLeft") {
                void this.openOtherProduct(-1);
                return e.preventDefault();
            }
            if (e.key == "ArrowRight") {
                void this.openOtherProduct(1);
                return e.preventDefault();
            }
        });

        if (this.$route.fullPath !== "/products" || this.$route.fullPath !== "/selection" ) {
            this.productSubmenuFilter(this.$route);
        } else {
            void this.listing.listBatch();
        }
    },

    watch: {
        "$route"(to) {
            if (to.fullPath === "/products") {
                this.$router.go();
            }
            this.productSubmenuFilter(to);
        }
    },

    methods: {
        /**
         * Handles filter updates
         */
        onChange() {
            this.lastSelectedId = 0;

            if (this.filterValues.id) {
                const id = this.filterValues.id;

                this.reset();

                this.filterValues.id = id;
            }

            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                void this.listing.listBatch({reset: true});
            }, 500);
        },

        /**
         * Opens a previously loaded product, emits an `open-product` event
         * @param product {Object} The opened product
         * @param i {Number} The product's index, used when navigating with
         * arrows
         * @param e {MouseEvent} The click event
         */
        openProduct(product, i = null, e = null) {
            if (e?.target?.nodeName == "INPUT")
                return;

            this.currentProduct = product;
            this.currentProductIdx = i;

            this.$emit("open-product", product);
        },

        /**
         * Selects a product in multiple mode (when `columns` contains
         * 'checkbox'), emits a `select-product` event
         * @param product {Object} The selected product
         * @param is_sequential
         */
        async selectProduct(product, is_sequential = false) {
            const is_selected = this.selectedProductIds.has(product.id);
            const MAX_COUNT = 1024;

            await new Promise(resolve => setTimeout(resolve));

            if (is_sequential && this.lastSelectedId) {
                const last_idx = this.products.findIndex(p =>
                    p.id == this.lastSelectedId
                );
                const current_idx = this.products.findIndex(p =>
                    p.id == product.id
                );

                if (last_idx != -1 && current_idx != -1) {
                    const [from, to] = [last_idx, current_idx]
                        .sort((a, b) => a - b);
                    const batch = from == last_idx
                        ? this.products.slice(from, to + 1)
                        : this.products.slice(from, to + 1).reverse();

                    if (batch.some(p => {
                        if (
                            this.selectedProductIds.has(p.id)
                            == is_selected
                        ) {
                            if (is_selected)
                                this.selectedProductIds.delete(p.id);
                            else {
                                if (this.selectedProductIds.size >= MAX_COUNT)
                                    return true;
                                this.selectedProductIds.add(p.id);
                            }
                        }
                    }))
                        return this.$root.showToast(
                            `Cannot select more than ${MAX_COUNT} products`
                        );
                }
            } else {
                if (is_selected)
                    this.selectedProductIds.delete(product.id);
                else {
                    if (this.selectedProductIds.size >= MAX_COUNT)
                        return this.$root.showToast(
                            `Cannot select more than ${MAX_COUNT} products`
                        );

                    this.selectedProductIds.add(product.id);
                }
            }

            this.lastSelectedId = product.id;

            this.$emit("select-product", product);
        },

        /**
         * Opens a neighboring product with offset `delta`, loads next batch if
         * necessary
         * @param delta An offset
         * @returns {Promise<void>}
         */
        async openOtherProduct(delta) {
            const new_idx = this.currentProductIdx + delta;

            if (
                this.listing.isLoading
                || new_idx < 0
                || this.listing.isFinished && new_idx >= this.products.length
            )
                return;

            if (new_idx >= this.products.length)
                await this.listing.listBatch();

            this.openProduct(this.products[new_idx], new_idx);
        },

        /**
         * Reloads the list of products
         * @returns {Promise<void>}
         */
        async reloadProducts() {
            this.openProduct(null);

            await this.listing.listBatch({reset: true});
        },

        /**
         * Resets all filters
         * @returns {Promise<void>}
         */
        async reset() {
            Object.assign(this.filterValues, {
                id: null,
                keywords: null,
                status: null,
                brand_ids: [],
                color_ids: [],
                material_ids: [],
                tag_ids: [],
                type_ids: [],
                subtype_ids: [],
                country_ids: [],
                priceFrom: null,
                priceTo: null,
                wholesalePriceFrom: null,
                wholesalePriceTo: null,
                boughtPriceFrom: null,
                boughtPriceTo: null,
                discountPercentFrom: null,
                discountPercentTo: null,
                createdFrom: null,
                createdTo: null,
                hasSerial: false,
                hasGuaranteeCard: false,
                hasDustBag: false,
                hasBox: false,
                grade: null,
                model: null
            });
        },

        /**
         * Shows/hides the desktop filter bar
         */
        reduceFilter() {
            this.$refs["filter"].reduce();
            this.reduceFilters = !this.reduceFilters;
        },

        /**
         * Opens the mobile filter popup
         */
        openFilterPopup() {
            this.$refs["filter-mobile"].show();
            this.$refs["popup-filter"].open();
        },

        /**
         * Closes the mobile filter popup
         */
        closeFilterPopup() {
            this.$refs["popup-filter"].close();
        },

        /**
         * Format the price in cents as a string or return "-"
         * @param {Product} product
         * @param {string} priceType
         * @return {string}
         */
        formatPrice(product, priceType) {
            const discountedPrice = priceType + "_discounted";
            const price = product[discountedPrice] ? product[discountedPrice] : product[priceType];

            return (price ?? null) === null
                ? "-"
                : Math.round(price / 100) + "€";
        },

        displayConsignementPriceInfo(product) {
            return "Dropshipping Price: " + Math.round(product.consignment_price_cents / 100) + "€";
        },

        /**
         * Handle item container scroll: synchronize horizontal scroll of the
         * header and * propagate event to products listing
         * @param e {HTMLElement}
         */
        handleItemsScroll(e) {
            this.$refs["listing-header"].scrollLeft =
                this.$refs["listing-items"].scrollLeft;

            this.listing.handleScroll(e);
        },

        productSubmenuFilter(url) {
            this.reset();
            Object.assign(this.filterValues, url.query);
            this.filterValues.status = "ACTIVE";
            this.onChange();
        },

        userHasPermission(permission) {
            return Api.user?.permissions.has(permission);
        }
    },

    components: {
        BulkActionsDropdown,
        Dropdown,
        DynamicDropdown,
        ProductCard,
        FilterBar,
        Popup,
        TooltipText,
    }
};
</script>

<template>
    <section class="products-list">
        <popup ref="popup-filter">
            <filter-bar
                ref="filter-mobile"
                @change="onChange"
                :filter-values="filterValues"/>
            <button class="button-apply" @click="closeFilterPopup">Apply</button>
        </popup>
        <filter-bar
            ref="filter"
            class="not-on-mobile"
            :filter-values="filterValues"
            @change="onChange"
            v-if="!hideFilters"
        />
        <div class="filter-settings" :class="{hidden: this.selectedProductIds.size === 0}">
            <div class="filter-buttons">
                <button class="not-on-mobile button-settings filters" @click="reduceFilter" v-if="!hideFilters">
                    <p v-if="this.reduceFilters">Show filters</p>
                    <p v-else>Hide filters</p>
                    <img src="/icons/filter.svg" height="20px"/>
                </button>
                <button class="on-mobile button-settings filters" @click="openFilterPopup" v-if="!hideFilters"/>
                <button class="button-settings"
                    :class="{rows: gridView, grid: !gridView}" @click="gridView = !gridView" />
            </div>
            <bulk-actions-dropdown
                :bulk-actions="bulkActions"
                :extra-bulk-actions="extraBulkActions"
                :product-ids="selectedProductIds"
                @selection-cleared="() => selectedProductIds.clear()"
                @action-finished="reloadProducts"
            />
        </div>
        <template v-if="!gridView">
            <div ref="listing-header" class="listing-header">
                <div class="row header">
                    <div class="col small"/>
                    <div v-if="columnsSet.has('id')" class="col medium">ID</div>
                    <div v-if="columnsSet.has('name')" class="col">Name</div>
                    <div v-if="columnsSet.has('brand')" class="col">Brand</div>
                    <div v-if="columnsSet.has('colors')" class="col hidden-mobile">Colors</div>
                    <div v-if="columnsSet.has('materials')" class="col hidden-mobile">Materials</div>
                    <div
                        v-if="columnsSet.has('prices') && userHasPermission('PRODUCT_SHOW_DISCOUNT')"
                        class="col price-col"
                    >Discount</div>
                    <div
                        v-if="columnsSet.has('prices') && userHasPermission('PRODUCT_SHOW_PURCHASE_PRICE')"
                        class="col price-col"
                    >Purchase price</div>
                    <div
                        v-if="columnsSet.has('prices') && userHasPermission('PRODUCT_SHOW_WHOLESALE_PRICE')"
                        class="col price-col"
                    >
                        Wholesale price
                    </div>
                    <div
                        v-if="columnsSet.has('prices') && userHasPermission('PRODUCT_SHOW_RETAIL_PRICE')"
                        class="col price-col"
                    >Retail price</div>
                    <div v-if="columnsSet.has('last_scrape')" class="col">Last scrape</div>
                    <div v-if="actionsList.length" class="col actions-col"></div>
                </div>
            </div>
            <div ref="listing-items" class="listing-items" @scroll="handleItemsScroll">
                <div class="empty-doodle" v-if="!listing.isLoading && !products.length"/>
                <div
                    v-for="(product, i) in products"
                    class="row clickable"
                    :class="{disabled: product.status != 'ACTIVE'}"
                    @click="e => openProduct(product, i, e)"
                >
                    <div class="col small">
                        <input
                            type="checkbox"
                            :checked="selectedProductIds.has(product.id)"
                            @click.prevent="e => selectProduct(product, e.shiftKey)"
                        >
                    </div>
                    <div v-if="columnsSet.has('id')" class="col medium">
                        <img class="product-row-image" alt="Product image" :src="product.image_urls[0]">
                        #{{product.id}}
                    </div>
                    <div v-if="columnsSet.has('name')" class="col">{{ product.name }}</div>
                    <div v-if="columnsSet.has('brand')" class="col">{{ product.brand.name }}</div>
                    <div v-if="columnsSet.has('colors')" class="col hidden-mobile">
                        <span class="product-tag" v-for="color in product.colors">{{ color.name }}</span>
                    </div>
                    <div v-if="columnsSet.has('materials')" class="col hidden-mobile">
                        <span class="product-tag" v-for="material in product.materials">{{ material.name }}</span>
                    </div>
                    <div
                        v-if="columnsSet.has('prices') && userHasPermission('PRODUCT_SHOW_DISCOUNT')"
                        class="col price-col"
                    >
                        {{ product.bought_price_discounted ?
                            Math.round((product.bought_price - product.bought_price_discounted)
                            / product.bought_price * 100) :
                            0
                        }}%
                    </div>
                    <div
                        v-if="columnsSet.has('prices') && userHasPermission('PRODUCT_SHOW_PURCHASE_PRICE')"
                        class="col price-col"
                    >
                        {{ formatPrice(product, "purchase_price_cents") }}
                    </div>
                    <div
                        v-if="columnsSet.has('prices') && userHasPermission('PRODUCT_SHOW_WHOLESALE_PRICE')"
                        class="col price-col"
                    >
                        <div>
                            {{ formatPrice(product, "wholesale_price_cents") }}
                            <font-awesome-icon icon="fa-solid fa-circle-info" style="color: var(--light-grey-1);" />
                            <TooltipText
                                v-if="userHasPermission('PRODUCT_SHOW_CONSIGNMENT_PRICE')"
                                :text="displayConsignementPriceInfo(product)"
                                location="bottom"
                            />
                        </div>
                    </div>
                    <div
                        v-if="columnsSet.has('prices') && userHasPermission('PRODUCT_SHOW_RETAIL_PRICE')"
                        class="col price-col"
                    >
                        {{ formatPrice(product, "retail_price_cents") }}
                    </div>
                    <div v-if="columnsSet.has('last_scrape')" class="col">
                        {{ new Date(product.last_scrape).toLocaleString("en-GB") }}
                    </div>
                    <div v-if="actionsList.length" class="col actions-col">
                        <button
                            v-for="action in actionsList"
                            class="mini-button"
                            :class="`action-${action}`"
                            @click.stop="$emit('do-product-action', product, action)"
                        />
                    </div>
                </div>
                <div class="products-spinner" v-if="listing.isLoading"></div>
            </div>
        </template>
        <template v-else>
            <div class="grid-body" @scroll="listing.handleScroll">
                <template
                    v-for="(product, i) in products"
                    class="grid-card"
                    :class="{unavailable: product.status != 'ACTIVE'}"
                >
                    <product-card
                        :product="product"
                        :selected="selectedProductIds.has(product.id)"
                        @select="is_sequential => selectProduct(product, is_sequential)"
                        @open-product="e => this.openProduct(product, i, e)"
                    />
                </template>
            </div>
        </template>
    </section>
</template>

<style>
.products-list {
    display: flex;
    flex-direction: column;
    flex: 1;
}
.products-list .controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
    width: 100%;
    margin: 15px 0;
}
.products-list .controls input {
    box-sizing: border-box;
}
.products-list .controls input[type="number"] {
    appearance: none;
    -webkit-appearance: none;
    width: 120px;
}
.products-list .controls > div {
    display: flex;
    flex-direction: row;
    align-items: center;
}
.products-list .controls > div > *:not(:first-child) {
    margin-left: 10px;
}
.products-list .controls > div.search-col {
    flex: 1;
}
.products-list .controls > div.search-col > input {
    width: 100%;
}
.products-list .controls > div.price-col {
    margin-right: auto;
}
.products-list .controls > div.date-col {
    flex-wrap: wrap;
}

.grid-body {
    flex: 1 1 0;
    min-height: 500px;
    display: flex;
    justify-content: space-evenly;
    align-content: flex-start;
    flex-wrap: wrap;
    gap: 20px;
    overflow-y: auto;
}
.grid-card.unavailable {
    opacity: .4;
}

.products-list .controls-view {
    display: flex;
    gap: 5px;
    justify-content: flex-end;
    align-items: center;
    min-height: 45px;
    margin-bottom: 10px;
}

.button-view {
    height: 28px;
}
button.button-view:hover {
    height: 28px;
    background-color: var(--grey);
    opacity: .8;
}
.button-view.rows {
    background: url("/icons/rows.svg") no-repeat center;
    background-size: contain;
}
.button-view.grid {
    background: url("/icons/grid.svg") no-repeat center;
    background-size: contain;
}
.button-view.filters {
    background: url("/icons/filter.svg") no-repeat center;
    background-size: contain;
}

.filter-form {
    visibility: collapse;
    max-height: 0;
    overflow: hidden;
    transition: all 0.25s ease-in-out;
}

.products-list .row-listing-items > .row {
    transition: all .2s ease-in-out;
}
.products-list .row-listing-items > .row:hover {
    background: var(--see-through-black-0);
}
.products-list .row-listing-items > .row.unavailable {
    opacity: .33;
    flex-wrap: wrap;
}
.products-list .row-listing-items > .row {
    cursor: pointer;
}

.products-list .row > .col:first-child {
    max-width: 120px;
}

.products-list .col.small {
    flex: 0;
    min-width: 30px;
}
.products-list .col.medium {
    flex: 0;
    min-width: 150px;
}
.products-list .col.price-col {
    flex: 0;
    min-width: 100px;
}

.products-list .product-row-image {
    display: inline-block;
    height: 40px;
    width: 40px;
    border-radius: 5px;
    margin-right: 10px;
    background: var(--grey);
    overflow: hidden;
}

@keyframes spin {
    0% { transform: rotate(0); }
    100% { transform: rotate(180deg); }
}
.products-list .products-spinner {
    height: 100%;
    width: 100%;
    background: url("/icons/loading.svg") no-repeat center;
    background-size: 64px;
    animation: spin 1s infinite ease-in-out;
    opacity: .1;
}

.products-list .filter-settings {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px;
}
.products-list .filter-settings .button-settings {
    border: 1px solid var(--see-through-grey);
    height: 28px;
}
.products-list .filter-settings button.button-settings:hover {
    height: 28px;
    background-color: var(--grey);
    opacity: .8;
}

.products-list .filter-settings .button-settings.rows {
    background: url("/icons/rows.svg") no-repeat center;
    background-size: contain;
    background-color: var(--white-grey);
}
.products-list .filter-settings .button-settings.grid {
    background: url("/icons/grid.svg") no-repeat center;
    background-size: contain;
}
.products-list .filter-settings .button-settings.filters {
    background-color: var(--white-grey);
}

.not-on-mobile.button-settings.filters {
    font-weight: normal;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
}

.products-list .filter-settings .filter-buttons {
    display: flex;
    gap: 5px;
    margin-left: 20px;
}

.products-list .button-apply {
    display: none;
}

.products-list .on-mobile {
    display: none;
}

@media only screen and (max-width: 600px) {
    .products-list > .listing-items > .row > .col.hidden-mobile,
    .products-list > .listing-header > .row > .col.hidden-mobile {
        display: none;
    }

    .products-list > .listing-header > .row > .col,
    .products-list .listing-items > .row > .col {
        flex: initial;
        min-width: 120px;
    }
    .products-list .row > .col:first-child {
        min-width: 30px;
    }

    .products-list > .listing-items > .row,
    .products-list > .listing-header > .row {
        justify-content: flex-start;
    }

    .products-list > .listing-header {
        overflow: hidden;
    }

    .products-list > .listing-items {
        overflow: auto;
    }

    .products-list > .listing-items > .row {
        flex-wrap: nowrap;
    }

    .products-list .on-mobile {
        display: block;
    }

    .products-list .not-on-mobile {
        display: none;
    }

    .products-list > .grid-body {
        height: 100%;
    }

    .grid-body > .grid-card {
        min-height: 300px;
        width: 275px;
    }

    .products-list .button-apply {
        display: block;
        margin-top: 10px;
        width: 100%;
    }

    .not-on-mobile.button-settings.filters {
        display: none;
    }

    .on-mobile.button-settings.filters {
        background: url("/icons/filter.svg") no-repeat center;
        background-size: contain;
    }
}

</style>
