<script>
import Api from "../services/Api.js";
import DynamicListing from "../services/DynamicListing.js";

export default {
    data() {
        return {
            shopsListing: new DynamicListing(({prev_id, batch_size}) =>
                Api.listShops({prev_id, batch_size})
            ),
            shop: null
        };
    },

    mounted() {
        void this.shopsListing.listBatch();
    },

    components: {}
};
</script>

<template>
    <main class="page shops-page">
        <section class="page-section">
            <div class="shops-cards">
                <template v-for="shop in shopsListing.items" :key="shop.id">
                    <a :href="`/shops/${shop.id}`" class="card">
                        <div>
                           <h2>{{ shop.name }}</h2>
                        </div>
                        <div class="img-icons">
                            <div
                                class="platform-img"
                                :class="['platform-' + shop.platform]"
                            />
                            <div
                                class="shop-type-icon"
                                :class="['type-' + (shop.is_importing | shop.is_exporting << 1)]"
                            />
                        </div>
                        <div class="product-statistics">
                            <div class="col">
                                Imported products: {{ shop.imported_products_count }}
                            </div>
                            <div>
                                Exported products: {{ shop.exported_products_count }}
                            </div>
                        </div>
                        <div>
                            <button class="shops-open-button">open</button>
                        </div>
                    </a>
                </template>
                <div class="card">
                    <button class="new-shop-button black" @click="$router.push('/shops/create')">
                        +
                    </button>
                </div>
                <div v-if="!shopsListing.items.length" class="empty-doodle"/>
            </div>
        </section>
    </main>
</template>

<style>

.shops-page {
    min-height: 0px;
}

.shops-cards {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
    gap: 40px;
}

.shops-cards .new-shop-button {
    font-family: Inconsilata;
    font-size: 30px;
    height: 100px;
    width: 100px;
}

.shops-cards .img-icons {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.shops-cards .card {
    background: var(--white-grey);
    border: 1px solid var(--white-grey);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-evenly;
    width: 400px;
    height: 450px;
    appearance: none;
    color: var(--light-grey-1);
}

.shops-cards a:hover {
    background: var(--white-color);
}

.shops-cards .shops-open-button:hover {
    background-color: var(--black-color);
}

.shops-cards .product-statistics {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
    font-style: italic;
}

.shops-cards .col.small {
    min-width: 100px;
    max-width: 100px;
    display: inline-block;
    text-align: right;
}
.shops-cards .platform-img,
.shops-cards .shop-type-icon {
    min-height: 25px;
    background-size: contain;
    background-repeat: no-repeat;
    width: 40px;
    height: 40px;
}
.shops-cards .platform-img {
    background-position: center;
    height: 40px;
    width: 40px;
}
.shops-cards .shop-type-icon.type-0 {background-image: url("/icons/import-export/0.svg");}
.shops-cards .shop-type-icon.type-1 {background-image: url("/icons/import-export/1.svg");}
.shops-cards .shop-type-icon.type-2 {background-image: url("/icons/import-export/2.svg");}
.shops-cards .shop-type-icon.type-3 {background-image: url("/icons/import-export/3.svg");}

@media only screen and (max-width: 800px) {

    .shops-cards {
        flex-direction: column;
        align-items: center;
    }

    .shops-cards .card {
        width: 100%;
        height: 250px;
        font-size: 12px;
    }

    .shops-cards .img-icons {
        flex-direction: row;
    }

    .shops-cards .new-shop-button {
        font-size: 15px;
        height: 80px;
        width: 80px;
    }

    .shops-cards .shops-open-button {
        font-size: 10px;
    }

    .shops-cards .platform-img,
    .shops-cards .shop-type-icon {
        width: 30px;
        height: 30px;
    }
}
</style>
