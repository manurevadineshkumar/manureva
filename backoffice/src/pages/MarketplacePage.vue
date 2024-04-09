<script>
import Api from "../services/Api.js";
import ChannelSubscription from "../services/ChannelSubscription.js";

import ProductsList from "../components/ProductsList.vue";

import MarketplacePopup from "../components/popups/MarketplacePopup.vue";
import ProductPickerPopup from "../components/popups/ProductPickerPopup.vue";
import ProductPopup from "../components/popups/ProductPopup.vue";
import DynamicListing from "@/services/DynamicListing.js";
import ExportedProductPopup from "@/components/popups/ExportedProductPopup.vue";

export default {
    data() {
        return {
            marketplaceId: this.$route.params.id,
            marketplace: null,
            marketplacePlatform: null,
            editedProduct: null,
            productsListing: new DynamicListing(
                ({prev_id, batch_size}) => Api.listMarketplaceExportedProducts({
                    marketplace_id: this.marketplace.id,
                    prev_id, batch_size
                }),
                {
                    transformer_fn(data) {
                        const exported_price = data.exported_price / 100
                            || null;

                        return {
                            ...data,
                            exported_price,
                            initial_price: exported_price
                        };
                    }
                }
            ),
            logChannel: {
                subscription: null,
                total: null,
                progress: 0
            },
            productActions: {
                delete: this.deleteProduct
            },
            LOG_CHANNEL: {
                name: "export",
                title: "Export",
                callback: this.launchExport
            },
            BULK_ACTION: {
                id: "remove-from-current-marketplace",
                name: "Remove from marketplace",
                callback: async product_ids => {
                    const {count, error} = await Api.removeMarketplaceExportedProducts(
                        this.marketplace.id,
                        [...product_ids]
                    );

                    if (error)
                        return this.$root.showToast(
                            "Error: " + error,
                            {type: "error"}
                        );

                    this.$root.showToast(
                        [
                            "Removed",
                            count,
                            (count == 1 ? "product" : "products"),
                            "from marketplace",
                        ].join(" "),
                        {type: "info"}
                    );

                    void this.$refs["products-list"].reloadProducts();
                }
            }
        };
    },

    computed: {
        marketplaceUrl() {
            return this.marketplace
                ? [
                    Api.BASE_URL,
                    "marketplace-products",
                    +this.marketplace.id + ":"
                    + encodeURIComponent(this.marketplace.token)
                ].join("/")
                : null;
        }
    },

    async mounted() {
        const {status, data} = await Api.getMarketplaceById(this.marketplaceId);

        if (status != 200)
            return this.$router.replace("/marketplaces");

        this.marketplace = data;

        const platforms = await Api.listMarketplacePlatforms();
        this.marketplacePlatform = platforms[this.marketplace.platform];

        void this.productsListing.listBatch();

        this.setupSubscription();
    },

    methods: {
        async updateMarketplace(marketplace) {
            this.marketplace = marketplace;

            this.productsListing.reset();
            void this.productsListing.listBatch();
        },

        async rotateToken() {
            const {data} = await Api.editMarketplace(
                this.marketplace.id,
                {rotate_token: 1}
            );

            if (data.error)
                return alert("Error: " + data.error);

            this.marketplace = data;
        },

        async deleteMarketplace() {
            if (!confirm(`Delete marketplace "${this.marketplace.name}"?`))
                return;

            await Api.deleteMarketplace(this.marketplace.id);

            this.$router.push("/marketplaces");
        },

        setupSubscription() {
            if (!this.marketplace?.log_channel)
                return;

            this.logChannel.subscription = new ChannelSubscription(
                this.marketplace.log_channel.uuid
            );

            this.logChannel.subscription.on(
                "data",
                data => Object.assign(this.logChannel, data)
            );
            this.logChannel.subscription.once(
                "end",
                () => Object.assign(
                    this.logChannel,
                    {subscription: null, total: null}
                )
            );
        },

        async launchExport() {
            const {
                data: {error, channel_uuid}
            } = await Api.launchMarketplaceExportSession(this.marketplace.id);

            if (error)
                return alert("Error: " + error);

            this.setupSubscription("export", channel_uuid);
        },

        async deleteExportedProduct(product) {
            const {data: {error}} = await Api.removeMarketplaceExportedProducts(
                this.marketplace.id, [product.id]
            );

            if (error)
                return alert("Error: " + error);

            const listing = this.productsListing;

            listing.items = listing.items.filter(it => it.id != product.id);
        },

        async applyProductPrice(product) {
            const {data: {error}} = await Api.updateMarketplaceExportedProduct(
                this.marketplace.id, product.id,
                {exported_price: product.exported_price * 100}
            );

            if (error) {
                product.exported_price = product.initial_price;
                return alert("Error: " + error);
            }
        },

        /**
         * Formats the purchase price of a product.
         *
         * @param {Object} product - The product object.
         * @returns {String} - The formatted purchase price.
         */
        async formatProductPurchasePrice(product) {
            const price = product.purchase_price_cents_discounted ?
                product.purchase_price_cents_discounted : product.purchase_price_cents;
            return (price / 100) + " €";
        },

        async editExportedProduct(product) {
            const {id, ...data} = product;
            const {data: {error}} = await Api.updateMarketplaceExportedProduct(
                this.marketplace.id, id, data
            );

            if (error)
                return alert("Error: " + error);

            this.$refs["exported-product-popup"].close();

            const item = this.productsListing.items.find(
                it => it.id == id
            );

            if (item)
                Object.assign(item, data);
        }
    },

    components: {
        MarketplacePopup,
        ProductPopup,
        ExportedProductPopup,
        ProductsList,
        ProductPickerPopup,
    }
};
</script>

<template>
    <marketplace-popup
        ref="edit-popup"
        @update="updateMarketplace"
    />
    <exported-product-popup ref="exported-product-popup" @save="editExportedProduct"/>
    <main class="page marketplace-page">
        <section class="page-section">
            <header v-if="marketplace" class="section-header">
                <div class="col platform-img" :class="['platform-' + marketplace.platform]"/>
                <h1>
                    {{ marketplace.name }}
                </h1>
                <button class="primary" @click="$refs['edit-popup'].open(marketplace)">
                    Edit
                </button>
                <button class="danger" @click="deleteMarketplace">
                    Delete
                </button>
            </header>
            <template v-if="marketplace">
                <header class="log-section">
                    <div
                        class="status-indicator"
                        :class="{active: !!logChannel.subscription}"
                    />
                    <h1>
                        Export
                    </h1>
                    <div v-if="logChannel.subscription" class="progress-bar">
                        <div
                            v-if="logChannel.total"
                            class="progress-bar-fill"
                            :style="{width: logChannel.progress / logChannel.total * 100 + '%'}"
                        />
                    </div>
                    <span v-if="logChannel.total" class="progress-count">
                        {{ logChannel.progress }} / {{ logChannel.total }}
                    </span>
                    <div class="controls">
                        <button
                            v-if="!logChannel.subscription"
                            class="success"
                            @click="launchExport"
                        >
                            Launch export
                        </button>
                    </div>
                </header>
            </template>
            <div v-if="marketplaceUrl" class="metafield">
                <span>URL:</span>
                <input :value="marketplaceUrl" readonly>
                <button class="mini-button action-sync" @click="rotateToken"/>
            </div>
            <section class="products-section products-list">
                <h1>
                    Exported products
                </h1>
                <div ref="listing-header" class="listing-header">
                    <div class="row header">
                        <div class="col buttons"/>
                        <div class="col medium">ID</div>
                        <div class="col">Name</div>
                        <div class="col medium">Purchase Price</div>
                        <div class="col medium">Exported Price</div>
                    </div>
                </div>
                <transition-group
                    tag="section"
                    name="row"
                    ref="listing-items"
                    class="listing-items"
                    @scroll="productsListing.handleScroll"
                >
                    <div
                        :key="0"
                        class="empty-doodle"
                        v-if="!productsListing.isLoading && !productsListing.items.length"
                    />
                    <div
                        v-for="product in productsListing.items"
                        :key="product.id"
                        class="row"
                        :class="{disabled: product.status != 'ACTIVE'}"
                    >
                        <div class="col buttons">
                            <button
                                class="mini-button action-delete"
                                @click="() => deleteExportedProduct(product)"
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
                            #{{ product.id }}
                        </div>
                        <div class="col">
                            {{ product.exported_name }}
                        </div>
                        <div class="col medium price">
                            {{ formatProductPurchasePrice(product) }}
                        </div>
                        <div class="col medium price">
                            {{ product.exported_price }} €
                        </div>
                    </div>
                </transition-group>
            </section>
        </section>
    </main>
</template>

<style>
.marketplace-page .log-section {
    min-height: 65px;
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 0;
}
.marketplace-page .log-section > h1 {
    margin: 0;
}
.marketplace-page .log-section .controls {
    margin-left: auto;
}
.marketplace-page .products-section {
    display: flex;
    flex-direction: column;
    flex: 1;
}
.marketplace-page .products-section > h1 {
    margin: 20px 0 10px 0;
}
.marketplace-page .platform-img {
    min-width: 30px;
    min-height: 30px;
    margin-right: 5px;
}
.marketplace-page .products-list .row .col.buttons {
    display: flex;
    gap: 10px;
    max-width: 80px;
    opacity: 0;
    transform: translateX(-10px);
    transition: all .2s ease;
}
.marketplace-page .products-list .row:hover .col.buttons {
    transform: none;
    opacity: 1;
}
.marketplace-page .progress-bar {
    flex: 1;
    height: 4px;
    background: var(--grey);
    border-radius: 4px;
    overflow: hidden;
}
@keyframes progress-bar-fill {
    from { background-position-x: 0; }
    to { background-position-x: 400px; }
}
.marketplace-page .progress-bar-fill {
    background: var(--bright-green);
    height: 100%;
    width: 50%;
    border-radius: 4px;
    background: linear-gradient(to right, var(--primary-blue), var(--magenta-blue) 50%, var(--primary-blue) 100%);
    background-size: 400px;
    animation: progress-bar-fill 2s linear infinite;
    transition: width .2s ease-out;
}
.marketplace-page .status-indicator {
    width: 10px;
    height: 10px;
    background: var(--grey);
    border-radius: 10px;
    transition: all .2s ease-in-out;
}
@keyframes status-indicator-pop {
    0% { transform: rotate(.25turn); }
    100% { transform: rotate(.75turn); }
}
.marketplace-page .status-indicator.active {
    width: 25px;
    height: 25px;
    background: url("/icons/loading.svg") no-repeat center;
    background-size: contain;
    opacity: .6;
    animation: status-indicator-pop infinite 1s ease-in-out;
}
.marketplace-page .metafield {
    display: flex;
    margin: 10px 0;
    align-items: center;
    gap: 10px;
}
.marketplace-page .metafield > *:nth-child(2) {
    margin-left: auto;
    display: block;
    min-width: 600px;
}
.marketplace-page .row-leave-to {
    opacity: 0;
}
.marketplace-page .products-list {
    position: relative;
}
.marketplace-page .row-leave-active {
    position: absolute;
    width: 100%;
}
.marketplace-page .col.price {
    font-weight: bold;
}
</style>
