<script>
import Api from "../../services/Api.js";

import Popup from "./Popup.vue";
import RangeInput from "../RangeInput.vue";

export default {
    emits: [
        "update"
    ],

    data() {
        return {
            shop: null,
            shopPlatforms: null,
            isNew: null
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

        isShopValid() {
            return this.shop
                && this.shop.platform
                && (
                    !this.shop.is_importing
                    || (this.shop.ranges || []).every(({to, percent}, i) =>
                        percent >= 0 && percent <= 100 && (
                            !i
                            || i == this.shop.ranges.length - 1
                            || this.shop.ranges[i - 1].to < to
                        )
                    )
                );
        }
    },

    async mounted() {
        this.shopPlatforms = await Api.listShopPlatforms();
    },

    methods: {
        open(shop = null) {
            this.isNew = !shop;

            if (!shop) {
                shop = {
                    name: "",
                    platform: null,
                    url: "",
                    ranges: [
                        {"to": null, "percent": 0}
                    ],
                    is_importing: true,
                    is_exporting: false
                };
            }

            this.shop = JSON.parse(JSON.stringify(shop));

            this.shop.is_importing = !!this.shop.is_importing;
            this.shop.is_exporting = !!this.shop.is_exporting;
            this.shop.initial_token = this.shop.token;
            this.shop.initial_url = this.shop.url;

            delete this.shop.token;

            this.$refs.popup.open();
        },

        async doAction() {
            const {id, ...shop} = this.shop;

            const {data} = id
                ? await Api.editShop(id, shop)
                : await Api.createShop(shop);

            if (data.error)
                return alert("Error: " + data.error);

            this.shop = data;

            if (id)
                this.$emit("update", data);

            await this.$refs.popup.close();
        },

        async updateShopType(type) {
            await new Promise(resolve => setTimeout(resolve));

            if (!this.shop.is_importing && !this.shop.is_exporting)
                this.shop[
                    "is_" + (type == "importing" ? "exporting" : "importing")
                ] = true;
        }
    },

    components: {
        Popup,
        RangeInput
    }
};
</script>

<template>
<popup ref="popup" class="shop-popup">
    <h1>
        {{ isNew ? "New" : "Edit" }} shop
    </h1>
    <form @submit.prevent="doAction">
        <div v-if="shopPlatforms && shop" class="fields">
            <label>Name</label>
            <input v-model="shop.name" required minlength="3" maxlength="64">
            <label :class="{disabled: !isNew}">Platform</label>
            <select v-model="shop.platform" :disabled="!isNew" required>
                <option :value="null" selected disabled>
                    Choose a platform...
                </option>
                <option v-for="platform in availablePlatforms" :key="platform.id" :value="platform.id">
                    {{ platform.title }}
                </option>
            </select>
            <template v-if="selectedShopPlatform">
                <label>Type</label>
                <div class="shop-type">
                    <div>
                        <input
                            id="import-checkbox"
                            type="checkbox"
                            v-model="shop.is_importing"
                            @click="() => updateShopType('importing')"
                        >
                        <label for="import-checkbox">Importing</label>
                    </div>
                    <div>
                        <input
                            id="export-checkbox"
                            type="checkbox"
                            v-model="shop.is_exporting"
                            @click="() => updateShopType('exporting')"
                        >
                        <label for="export-checkbox">Exporting</label>
                    </div>
                </div>
                <label>URL</label>
                <input
                    v-model="shop.url"
                    :placeholder="shop.initial_url || selectedShopPlatform.examples.url"
                    autocomplete="nickname"
                    required minlength="4" maxlength="1024"
                >
                <label>API Token</label>
                <input
                    v-model="shop.token"
                    class="token-input"
                    :placeholder="shop.initial_token || selectedShopPlatform.examples.token"
                >
            </template>
        </div>
        <div class="buttons">
            <button :class="isNew ? 'success' : 'primary'" :disabled="!isShopValid">
                {{ isNew ? "Create" : "Save" }}
            </button>
        </div>
    </form>
</popup>
</template>

<style>
.shop-popup {
    min-width: 720px;
}
.price-ranges-enter-from,
.price-ranges-leave-to {
    opacity: 0;
    transition: all .2s ease-in-out;
}
.shop-popup h1 {
    margin: 0 0 20px 0;
}
.shop-popup .fields {
    display: grid;
    grid-template-columns: 160px 1fr;
    align-items: center;
    gap: 10px 20px;
}
.shop-popup .fields > :nth-child(odd) {
    display: inline-block;
    text-align: right;
    font-weight: bold;
}
.shop-popup .shop-type {
    display: flex;
    gap: 20px;
}
.shop-popup .shop-type > div {
    display: flex;
    align-items: center;
    gap: 10px;
}
.shop-popup .token-input {
    font-family: monospace;
}
.shop-popup .price-ranges-label {
    align-self: flex-start;
}
.shop-popup .buttons {
    display: flex;
    margin-top: 20px;
    gap: 15px;
}
.shop-popup .buttons > button:last-child {
    margin-left: auto;
}
</style>
