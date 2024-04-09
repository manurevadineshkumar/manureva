<script>
import Popup from "./Popup.vue";
import DynamicListing from "../../services/DynamicListing.js";

export default {
    emits: ["select"],

    props: {
        entityName: {
            type: String
        },
        listingFunction: {
            type: Function
        },
        managePage: {
            type: String,
            default: null
        }
    },

    data() {
        return {
            listing: null
        };
    },

    methods: {
        open() {
            if (!this.listing) {
                this.listing = new DynamicListing(this.listingFunction);
                void this.listing.listBatch();
            }

            this.$refs.popup.open();
        },

        close() {
            this.$refs.popup.close();
        },

        onSelect(entity) {
            this.close();
            this.$emit("select", entity);
        }
    },

    components: {
        Popup
    }
};
</script>
<template>
    <popup ref="popup" class="bulk-action-popup">
        <h1>
            Pick a {{ entityName }}
        </h1>
        <div v-if="listing" class="listing-items" @scroll="listing.handleScroll">
            <div
                v-for="item in listing.items"
                class="row"
                @click="() => onSelect(item)"
            >{{ item.name }}</div>
        </div>
        <router-link v-if="managePage" :to="managePage">
            <button>
                Manage {{ entityName }}s...
            </button>
        </router-link>
    </popup>
</template>

<style>
.bulk-action-popup {
    display: flex;
    flex-direction: column;
    max-height: 400px;
}
.bulk-action-popup a {
    width: 100%;
    display: flex;
    flex-direction: column;
    margin-top: 20px;
}
.bulk-action-popup h1 {
    margin-bottom: 20px;
}
.bulk-action-popup .listing-items {
    min-height: 200px;
}
.bulk-action-popup .row {
    cursor: pointer;
}
</style>
