<script>
import Api from "../services/Api.js";
import DynamicListing from "../services/DynamicListing.js";

import MarketplacePopup from "../components/popups/MarketplacePopup.vue";

export default {
    props: {
        columns: {
            type: String,
            default: "name platform products-count"
        }
    },

    data() {
        return {
            marketplacesListing: new DynamicListing(({prev_id, batch_size}) =>
                Api.listMarketplaces({prev_id, batch_size})
            ),
            marketplace: null,
            columnSet: new Set(this.columns.split(" ").filter(Boolean))
        };
    },

    mounted() {
        void this.marketplacesListing.listBatch();
    },

    components: {MarketplacePopup}
};
</script>

<template>
    <marketplace-popup
        ref="new-popup"
        @close="marketplacesListing.listBatch({reset: true})"
    />
    <main class="page marketplaces-page">
        <section class="page-section">
            <header class="section-header">
                <h1>
                    CONNECTED MARKETPLACES
                </h1>
                <button @click="$refs['new-popup'].open()" class="black">
                    Add a marketplace
                </button>
            </header>
            <div class="listing-header marketplaces-list">
                <div class="row header">
                    <div class="col">Marketplace name</div>
                    <div class="col">Platform</div>
                    <div class="col small">Products</div>
                </div>
            </div>
            <div class="listing-items marketplaces-list">
                <template v-for="marketplace in marketplacesListing.items" :key="marketplace.id">
                    <a :href="`/marketplaces/${marketplace.id}`" class="row">
                        <div class="col">
                            {{ marketplace.name }}
                        </div>
                        <div
                            class="col platform-img"
                            :class="['platform-' + marketplace.platform]"
                        />
                        <div class="col small">
                            {{ marketplace.products_count }}
                        </div>
                    </a>
                </template>
                <div v-if="!marketplacesListing.items.length" class="empty-doodle"/>
            </div>
        </section>
    </main>
</template>

<style>
.marketplaces-list .row {
    appearance: none;
    color: var(--mid-grey);
}
.marketplaces-list .col.small {
    min-width: 100px;
    max-width: 100px;
    display: inline-block;
    text-align: right;
}
.marketplaces-list .platform-img,
.marketplaces-list .marketplace-type-col {
    min-height: 25px;
    background-size: contain;
    background-repeat: no-repeat;
}
.marketplaces-list .platform-img {
    background-position: left 20px center;
}
.marketplaces-list .marketplace-type-col.type-0 {background-image: url("/icons/import-export/0.svg");}
.marketplaces-list .marketplace-type-col.type-1 {background-image: url("/icons/import-export/1.svg");}
.marketplaces-list .marketplace-type-col.type-2 {background-image: url("/icons/import-export/2.svg");}
.marketplaces-list .marketplace-type-col.type-3 {background-image: url("/icons/import-export/3.svg");}
</style>
