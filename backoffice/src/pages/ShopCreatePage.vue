<script>
import PageLayout from "../components/ui/PageLayout.vue";
import PageSection from "../components/ui/PageSection.vue";
import DiscountRangeEditableTable from "../components/editable-table/DiscountRangeEditableTable.vue";

import Api from "../services/Api.js";
import ArrayUtils from "../services/ArrayUtils.js";

export default {
    name: "ShopCreatePage",

    data() {
        return {
            isLoading: false,
            step: 1,
            shopPlatforms: [],
            shop: {
                name: "",
                platform: null,
                currency: null,
                is_importing: true,
                is_exporting: false,
                url: "",
                original_url: null,
                token: "",
                api_secret: "",
                day_ranges: [30, null],
                price_ranges: [100, null],
                discount_values: [
                    [1, 2],
                    [3, 4]
                ],
            },
        };
    },

    computed: {
        availablePlatforms() {
            return Object.entries(this.shopPlatforms)
                .map(([id, platform]) => ({...platform, id}));
        },

        selectedShopPlatform() {
            return this.shopPlatforms[this.shop.platform];
        },

        isStep1Valid() {
            return !this.shop.name
                || !this.shop.platform
                || !this.shop.url
                || !this.shop.token
                || !this.shop.api_secret;
        },
    },

    methods: {
        async updateShopType(type) {
            await new Promise(resolve => setTimeout(resolve));

            if (!this.shop.is_importing && !this.shop.is_exporting)
                this.shop[
                    "is_" + (type == "importing" ? "exporting" : "importing")
                ] = true;
        },

        async createShop() {
            this.isLoading = true;
            const data = await Api.createShop(this.shop);
            this.isLoading = false;

            if (data.status !== 200) {
                return this.$root.showToast(`Error: ${data.data.error}`, {type: "error"});
            }

            this.redirectToShopsPage();
        },

        async fetchShopDetails() {
            if (this.isStep1Valid) {
                return this.$root.showToast("Please fill all fields", {type: "info"});
            }

            this.isLoading = true;
            const data = await Api.fetchShopDetails({
                platform: this.shop.platform,
                url: this.shop.url,
                token: this.shop.token,
                is_exporting: this.shop.is_exporting,
            });
            this.isLoading = false;

            if (data.status !== 200) {
                return this.$root.showToast(`Error: ${data.data.error}`, {type: "error", duration: 5000});
            }

            this.shop.currency = data.data.currency;
            this.shop.original_url = data.data.original_url;

            if (!this.shop.is_importing) {
                return await this.createShop();
            }

            this.step = 2;
        },

        async checkDiscountValues() {
            if (ArrayUtils.isAscending(this.shop.day_ranges) === false) {
                return this.$root.showToast("Day ranges must be in ascending order", {type: "info"});
            }

            if (ArrayUtils.isAscending(this.shop.price_ranges) === false) {
                return this.$root.showToast("Price ranges must be in ascending order", {type: "info"});
            }

            if (ArrayUtils.checkValuesInRange(this.shop.discount_values, 0, 100) === false) {
                return this.$root.showToast("Discount values must be between 0 and 100", {type: "info"});
            }

            return await this.createShop();
        },

        resetDiscountValues() {
            this.shop.discount_values = [
                [1, 2],
                [3, 4]
            ];
            this.shop.day_ranges = [30, null];
            this.shop.price_ranges = [100, null];
        },

        redirectToShopsPage() {
            this.$router.push("/shops");
        },
    },

    async mounted() {
        this.shopPlatforms = await Api.listShopPlatforms();
    },

    components: {
        PageLayout,
        PageSection,
        DiscountRangeEditableTable
    }
};
</script>

<template>
    <PageLayout>
        <PageSection class="shop-create-section">
            <h1>CREATE SHOP</h1>
            <template v-if="step === 1">
                <h2>Step 1: Registrer your shop</h2>

                <h3>Name</h3>
                <input type="text" v-model="shop.name" required minlength="3" maxlength="64" placeholder="Shop Name">

                <h3>Platform</h3>
                <select v-model="shop.platform" required>
                    <option :value="null" selected disabled>
                        Choose a platform...
                    </option>
                    <option v-for="platform in availablePlatforms" :key="platform.id" :value="platform.id">
                        {{ platform.title }}
                    </option>
                </select>

                <template v-if="selectedShopPlatform">

                    <h3>Type</h3>
                    <div class="shop-type">
                        <input
                            id="import-checkbox"
                            type="checkbox"
                            v-model="shop.is_importing"
                            @click="() => updateShopType('importing')"
                        >
                        <label for="import-checkbox">Importing</label>

                        <input
                            id="export-checkbox"
                            type="checkbox"
                            v-model="shop.is_exporting"
                            @click="() => updateShopType('exporting')"
                        >
                        <label for="export-checkbox">Exporting</label>
                    </div>

                    <h3>URL</h3>
                    <input
                        v-model="shop.url"
                        :placeholder="shop.initial_url || selectedShopPlatform.examples.url"
                        autocomplete="nickname"
                        required minlength="4" maxlength="1024"
                    >

                    <h3>API Token</h3>
                    <input
                        v-model="shop.token"
                        :placeholder="shop.token || selectedShopPlatform.examples.token"
                    >

                    <h3>API Secret</h3>
                    <input
                        v-model="shop.api_secret"
                        placeholder="You API secret"
                    >
                </template>
            </template>

            <template v-if="step === 2">
                <h2>Step 2: Setup price decreases</h2>

                <h3>You currency is {{ shop.currency }}</h3>
                <DiscountRangeEditableTable
                    :dayRanges="shop.day_ranges"
                    :priceRanges="shop.price_ranges"
                    :discountValues="shop.discount_values"
                    :currency="shop.currency"
                >
                </DiscountRangeEditableTable>
                <div class="pt-5">
                    <button class="black" @click="resetDiscountValues">Reset</button>
                </div>
            </template>
        </PageSection>

        <div class="footer-buttons">
            <template v-if="!isLoading">
                <button class="black" v-if="step > 1" @click="step -= 1">Previous</button>
                <button class="black" v-if="step === 1 && !this.shop.is_importing" @click="fetchShopDetails">
                    Finish
                </button>
                <button class="black" v-else-if="step === 1" @click="fetchShopDetails">Go to step 2</button>
                <button class="black" v-else-if="step === 2" @click="checkDiscountValues">Finish</button>
            </template>
            <template v-else>
                <p>Loading...</p>
            </template>
        </div>
    </PageLayout>
</template>

<style scoped>

h3, h2 {
    margin-top: 20px;
}

.shop-create-section {
    padding: 50px;
    margin-bottom: 0px;
}

.shop-type {
    display: flex;
    gap: 20px;
}
.footer-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 20px;
}

@media only screen and (max-width: 600px) {
    .shop-create-section {
        padding: 10px;
    }
}
</style>
