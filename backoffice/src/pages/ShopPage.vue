<script>
import Api from "../services/Api.js";
import ChannelSubscription from "../services/ChannelSubscription.js";
import DynamicListing from "@/services/DynamicListing.js";

import ShopPopup from "../components/popups/ShopPopup.vue";
import ProductPickerPopup from "../components/popups/ProductPickerPopup.vue";
import ProductPopup from "../components/popups/ProductPopup.vue";
import ExportedProductPopup from "@/components/popups/ExportedProductPopup.vue";
import ProductsList from "../components/ProductsList.vue";
import ImportingShopTab from "../components/connectedShops/ImportingShopTab.vue";
import ExportingShopTab from "../components/connectedShops/ExportingShopTab.vue";
import SettingsTab from "../components/connectedShops/SettingsTab.vue";

import {
    ProductStatusEnum,
} from "../enums/index.js";

export default {
    data() {
        return {
            loading: false,
            tab: null,
            shopId: this.$route.params.id,
            shop: null,
            shopPlatform: null,
            editedProduct: null,
            importedProductsListing: new DynamicListing(
                ({prev_id, batch_size}) => Api.listShopImportedProducts({
                    shop_id: this.shop.id,
                    prev_id, batch_size
                }),
            ),
            exportedProductsListing: new DynamicListing(
                ({prev_id, batch_size}) => Api.listShopExportedProducts({
                    shop_id: this.shop.id,
                    prev_id, batch_size
                }),
                {
                    transformer_fn(data) {
                        const exported_price = Math.round(data.exported_price / 100)
                            || null;
                        return {
                            ...data,
                            exported_price,
                            initial_price: exported_price
                        };
                    }
                }
            ),
            logChannels: {
                setup: {
                    subscription: null,
                    total: null,
                    progress: 0
                },
                import: {
                    subscription: null,
                    total: null,
                    progress: 0
                },
                export: {
                    subscription: null,
                    total: null,
                    progress: 0
                }
            },
            productActions: {
                delete: this.deleteProduct
            },
            LOG_CHANNELS: [
                {
                    name: "setup",
                    title: "Setup",
                    predicate: () => true,
                    callback: this.launchSetup
                },
                {
                    name: "import",
                    title: "Import",
                    predicate: () => this.shop?.is_importing,
                    callback: this.launchImport
                },
                {
                    name: "export",
                    title: "Export",
                    predicate: () => this.shop?.is_exporting,
                    callback: this.launchExport
                }
            ],
            BULK_ACTION: {
                id: "remove-from-current-shop",
                name: "Remove from shop",
                callback: async product_ids => {
                    const {count, error} = await Api.removeShopExportedProducts(
                        this.shop.id,
                        [...product_ids],
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
                            "from shop",
                        ].join(" "),
                        {type: "info"}
                    );

                    void this.$refs["products-list"].reloadProducts();
                }
            },
            ProductStatusEnum,
            ProductStatusEnum,
        };
    },

    async mounted() {
        const {status, data} = await Api.getShopById(this.shopId);

        if (status != 200)
            return this.$router.replace("/shops");

        this.shop = data;
        this.shopPlatform = (await Api.listShopPlatforms())[this.shop.platform];

        if (this.shop.is_importing)
            void this.importedProductsListing.listBatch();
        if (this.shop.is_exporting)
            void this.exportedProductsListing.listBatch();

        this.LOG_CHANNELS.forEach(({name}) => {
            if (this.shop.log_channels[name])
                this.setupSubscription(name, this.shop.log_channels[name]);
        });
    },

    methods: {
        async deleteShop() {
            if (!confirm(`Delete shop "${this.shop.name}"?`))
                return;

            this.loading = true;
            await Api.deleteShop(this.shop.id);
            this.loading = false;

            this.$router.push("/shops");
        },

        setupSubscription(type, uuid) {
            const channel = this.logChannels[type];

            channel.subscription = new ChannelSubscription(uuid);

            channel.subscription.on(
                "data",
                data => Object.assign(channel, data)
            );
            channel.subscription.once(
                "end",
                () => {
                    this.loading = false;
                    Object.assign(channel, {subscription: null, total: null});

                    const listing = {
                        "import": this.importedProductsListing,
                        "export": this.exportedProductsListing,
                    }[type];

                    listing?.listBatch({reset: true});
                }
            );
        },

        async launchSetup() {
            if (!confirm(
                "Launching the setup will reset all current bindings.\n"
                + "Proceed anyway?"
            ))
                return;

            this.loading = true;
            const {
                data: {error, channel_uuid}
            } = await Api.launchShopSetupSession(this.shop.id);

            if (error) {
                this.loading = false;
                return alert("Error: " + error);
            }

            this.setupSubscription("setup", channel_uuid);
        },

        async launchImport() {
            this.loading = true;
            const {
                data: {error, channel_uuid}
            } = await Api.launchShopImportSession(this.shop.id);

            if (error) {
                this.loading = false;
                return alert("Error: " + error);
            }

            this.setupSubscription("import", channel_uuid);
        },

        async launchExport() {
            this.loading = true;
            const {
                data: {error, channel_uuid}
            } = await Api.launchShopExportSession(this.shop.id);

            if (error) {
                this.loading = false;
                return alert("Error: " + error);
            }

            this.setupSubscription("export", channel_uuid);
        },

        async deleteExportedProduct(product) {
            this.loading = true;
            const {data: {error}} = await Api.removeShopExportedProducts(
                this.shop.id, [product.id]
            );
            this.loading = false;

            if (error)
                return alert("Error: " + error);

            const listing = this.exportedProductsListing;
            listing.items = listing.items.filter(it => it.id != product.id);

            this.shop.exported_products_count--;
        },

        async applyProductPrice(product) {
            this.loading = true;
            const {data: {error}} = await Api.updateShopExportedProduct(
                this.shop.id, product.id,
                {exported_price: product.exported_price * 100}
            );
            this.loading = false;

            if (error) {
                product.exported_price = product.initial_price;
                return alert("Error: " + error);
            }
        },

        async editExportedProduct(product) {
            this.loading = true;
            const {id, ...data} = product;
            const {data: {error}} = await Api.updateShopExportedProduct(
                this.shop.id, id, data
            );
            this.loading = false;

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
        ExportingShopTab,
        ImportingShopTab,
        ShopPopup,
        ProductPopup,
        ExportedProductPopup,
        ProductsList,
        ProductPickerPopup,
        SettingsTab
    }
};
</script>

<template>
    <shop-popup
        ref="edit-popup"
        @update="new_shop => { this.shop = new_shop; }"
    />
    <exported-product-popup ref="exported-product-popup" @save="editExportedProduct"/>
    <main class="page shop-page">
        <div v-if="loading">Loading...</div>
        <template v-if="shop" v-for="({name, predicate}) of LOG_CHANNELS">
            <header v-if="predicate() && logChannels[name].subscription" class="log-section">
                <div
                    class="status-indicator"
                    :class="{active: !!logChannels[name].subscription}"
                />
                <div v-if="logChannels[name].subscription" class="progress-bar">
                    <div
                    v-if="logChannels[name].total"
                    class="progress-bar-fill"
                    :style="{width: logChannels[name].progress / logChannels[name].total * 100 + '%'}"
                />
                </div>
                <span v-if="logChannels[name].total" class="progress-count">
                    {{ logChannels[name].progress }} / {{ logChannels[name].total }}
                </span>
            </header>
        </template>
        <div class="metafield" v-for="{name, value} in shop?.metafields">
            <span>{{ name }}:</span>
            <input :value="value" readonly>
        </div>
        <section class="page-section">
            <div v-if="shop" class="section-header">
                <div class="col platform-img" :class="['platform-' + shop.platform]"/>
                <h1>
                    {{ shop.name }}
                </h1>
                <v-tabs
                    v-model="tab"
                    color="deep-purple-accent-4"
                    align-tabs="end"
                >
                    <v-tab v-if="shop?.is_exporting" value="export" class="shop-page-tab">Export</v-tab>
                    <v-tab v-if="shop?.is_importing" value="import" class="shop-page-tab">Import</v-tab>
                    <v-tab v-if="shop" value="settings" class="shop-page-tab">Settings</v-tab>
                </v-tabs>
            </div>
            <v-window v-model="tab">
                <v-window-item value="export">
                    <section v-if="shop?.is_exporting" class="products-section products-list">
                        <exporting-shop-tab
                            ref="exporting-shop-view"
                            :shop="shop"
                            :exported-products-listing="exportedProductsListing"
                            :loading="loading"
                            @callback="launchExport()"
                            @delete-exporting-product="deleteExportedProduct"
                            @apply-prodcut-price="applyProductPrice"
                        />
                    </section>
                </v-window-item>
                <v-window-item value="import">
                    <section v-if="shop?.is_importing" class="products-section products-list">
                        <importing-shop-tab
                            ref="importing-shop-view"
                            :shop="shop"
                            :imported-products-listing="importedProductsListing"
                            :loading="loading"
                            @callback="launchImport()"
                        />
                    </section>
                </v-window-item>
                <v-window-item value="settings">
                    <div class="d-flex align-center justify-start">
                        <settings-tab
                            ref="settings-tab"
                            :shop="shop"
                            :shopPlatform="shopPlatform"
                            :loading="loading"
                            @openShopPopUp="$refs['edit-popup'].open(shop)"
                            @deleteShop="deleteShop"
                            @launchSetup="launchSetup()"
                        />
                    </div>
                </v-window-item>
            </v-window>
        </section>
    </main>
</template>

<style>

.shop-page .row > .col {
    justify-content: center;
    align-items: center;
}

.shop-page .section-header {
    flex-wrap: wrap;
}

.products-list .col.medium {
    text-align: center;
}

.v-btn__overlay, .v-btn__underlay {
    display: none;
}
.shop-page .v-btn.v-tab:hover {
    border-radius: 5px;
    background-color: transparent;
}

.shop-page .shop-page-tab:hover {
    color: var(--regular-violet);
    background-color: transparent;
}

.shop-page .log-section {
    min-height: 65px;
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 0;
}
.shop-page .log-section > h1 {
    margin: 0;
}
.shop-page .log-section .controls {
    margin-left: auto;
}
.shop-page .products-section {
    display: flex;
    flex-direction: column;
    flex: 1;
}
.shop-page .products-section > h1 {
    margin: 20px 0 10px 0;
    display: flex;
    align-items: center;
}
.shop-page .products-section > h1 > span {
    font-size: 12pt;
    font-weight: normal;
    margin-left: auto;
}
.shop-page .platform-img {
    min-width: 30px;
    min-height: 30px;
    margin-right: 5px;
}
.shop-page .products-list .row {
    position: relative;
}
.shop-page .products-list .row .col.buttons {
    display: flex;
    gap: 10px;
    max-width: 80px;
    opacity: 0;
    transform: translateX(-10px);
    transition: all .2s ease;
}
.shop-page .products-list .row:hover .col.buttons {
    transform: none;
    opacity: 1;
}
.shop-page .progress-bar {
    flex: 1;
    height: 4px;
    background: var(--off-white);
    border-radius: 4px;
    overflow: hidden;
}
@keyframes progress-bar-fill {
    from { background-position-x: 0; }
    to { background-position-x: 400px; }
}
.shop-page .progress-bar-fill {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(to right, var(--primary-blue), var(--magenta-blue) 50%, var(--primary-blue) 100%);
    background-size: 400px;
    animation: progress-bar-fill 2s linear infinite;
    transition: width .2s ease-out;
}
.shop-page .status-indicator {
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
.shop-page .status-indicator.active {
    width: 25px;
    height: 25px;
    background: url("/icons/loading.svg") no-repeat center;
    background-size: contain;
    opacity: .6;
    animation: status-indicator-pop infinite 1s ease-in-out;
}
.shop-page .metafield {
    display: flex;
    margin: 10px 0;
    align-items: center;
    gap: 20px;
}
.shop-page .metafield > *:nth-child(2) {
    margin-left: auto;
    min-width: 50%;
}
.shop-page .row-leave-to {
    opacity: 0;
    margin-top: -64px;
    transform: translateY(64px);
}
.shop-page .products-list {
    position: relative;
}
.shop-page .price-input {
    width: 100%;
    text-align: center;
}
.shop-page .price-input.base {
    opacity: .5;
    color: var(--black-grey);
}
.shop-page .not-exported-tag {
    position: absolute;
    background: var(--bright-yellow);
    color: var(--bright-yellow);
    padding: 0;
    font-size: 10pt;
    border-radius: 10px;
    margin: -40px 0 0 30px;
    white-space: nowrap;
    overflow: hidden;
    max-width: 20px;
    transition: all .2s ease;
}
.shop-page .row:hover .not-exported-tag {
    max-width: 150px;
    padding: 0 10px;
    color: var(--black-grey);
}

.shop-page .page-section .title-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 20px;
    margin-left: 10px;
    margin-right: 20px;
}

@media only screen and (max-width: 800px) {
    .shop-page .controls {
        margin: 25px 0 10px 0;
    }

    .shop-page .controls > button {
        width: 150px;
        height: 40px;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .shop-page .page-section .title-section {
        justify-content: center;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
        margin-top: 10px;
    }

    .shop-page .products-section > .title-section > h1 {
        font-size: 18px;
    }

    .shop-page .products-section > .title-section > p {
        font-size: 12px;
    }

    .shop-page .shop-page-tab {
        font-size: 12px;
    }
}
</style>
