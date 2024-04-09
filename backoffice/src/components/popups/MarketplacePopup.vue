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
            marketplace: null,
            marketplacePlatforms: null,
            isNew: null
        };
    },

    computed: {
        availablePlatforms() {
            return Object.entries(this.marketplacePlatforms)
                .map(([id, platform]) => ({...platform, id}));
        },

        selectedMarketplacePlatform() {
            return this.marketplacePlatforms[this.marketplace.platform];
        },

        isMarketplaceValid() {
            return this.marketplace
                && this.marketplace.platform
                && (this.marketplace.ranges.every(({to, percent}, i) =>
                    percent >= 0 && percent <= 100 && (
                        !i
                        || i == this.marketplace.ranges.length - 1
                        || this.marketplace.ranges[i - 1].to < to
                    )
                ));
        }
    },

    async mounted() {
        this.marketplacePlatforms = await Api.listMarketplacePlatforms();
    },

    methods: {
        open(marketplace = null) {
            this.isNew = !marketplace;

            if (!marketplace) {
                marketplace = {
                    name: "",
                    platform: null,
                    ranges: [
                        {to: null, percent: 0}
                    ]
                };
            }

            this.marketplace = JSON.parse(JSON.stringify(marketplace));

            this.marketplace.initial_token = this.marketplace.token;
            this.marketplace.initial_url = this.marketplace.url;

            delete this.marketplace.token;

            this.$refs.popup.open();
        },

        async doAction() {
            const {id, ...marketplace} = this.marketplace;

            const {data} = id
                ? await Api.editMarketplace(id, marketplace)
                : await Api.createMarketplace(marketplace);

            if (data.error)
                return alert("Error: " + data.error);

            this.marketplace = data;

            if (id)
                this.$emit("update", data);

            await this.$refs.popup.close();
        }
    },

    components: {
        Popup,
        RangeInput
    }
};
</script>

<template>
<popup ref="popup" class="marketplace-popup">
    <h1>
        {{ isNew ? "New" : "Edit" }} marketplace
    </h1>
    <form @submit.prevent="doAction">
        <div v-if="marketplacePlatforms && marketplace" class="fields">
            <label>Name</label>
            <input v-model="marketplace.name" required minlength="3" maxlength="64">
            <label :class="{disabled: !isNew}">Platform</label>
            <select v-model="marketplace.platform" :disabled="!isNew" required>
                <option :value="null" selected disabled>
                    Choose a platform...
                </option>
                <option v-for="platform in availablePlatforms" :key="platform.id" :value="platform.id">
                    {{ platform.title }}
                </option>
            </select>
            <label class="price-ranges-label">
                Export price increases
            </label>
            <range-input ref="range-input" :ranges="marketplace.ranges"/>
        </div>
        <div class="buttons">
            <button :class="isNew ? 'success' : 'primary'" :disabled="!isMarketplaceValid">
                {{ isNew ? "Create" : "Save" }}
            </button>
        </div>
    </form>
</popup>
</template>

<style>
.marketplace-popup {
    min-width: 720px;
}
.price-ranges-enter-from,
.price-ranges-leave-to {
    opacity: 0;
    transition: all .2s ease-in-out;
}
.marketplace-popup h1 {
    margin: 0 0 20px 0;
}
.marketplace-popup .fields {
    display: grid;
    grid-template-columns: 160px 1fr;
    align-items: center;
    gap: 10px 20px;
}
.marketplace-popup .fields > :nth-child(odd) {
    display: inline-block;
    text-align: right;
    font-weight: bold;
}
.marketplace-popup .marketplace-type {
    display: flex;
    gap: 20px;
}
.marketplace-popup .marketplace-type > div {
    display: flex;
    align-items: center;
    gap: 10px;
}
.marketplace-popup .token-input {
    font-family: monospace;
}
.marketplace-popup .price-ranges-label {
    align-self: flex-start;
}
.marketplace-popup .buttons {
    display: flex;
    margin-top: 20px;
    gap: 15px;
}
.marketplace-popup .buttons > button:last-child {
    margin-left: auto;
}
</style>
