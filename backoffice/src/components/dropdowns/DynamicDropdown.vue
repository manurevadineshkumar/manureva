<script>
import DynamicListing from "../../services/DynamicListing.js";

import Dropdown from "./Dropdown.vue";

export default {
    emits: [
        "change"
    ],

    components: {
        Dropdown
    },

    props: {
        listingFunction: Function,
    },

    data() {
        return {
            listing: new DynamicListing(this.listingFunction)
        };
    },

    computed: {
        selected() {
            return this.$refs.dropdown.selected;
        }
    },

    mounted() {
        this.loadNextBatch();
    },

    methods: {
        async reload() {
            await this.listing.listBatch({reset: true});
        },

        async loadNextBatch() {
            await this.listing.listBatch();
        },

        reset() {
            this.$refs.dropdown.reset();
        }
    }
};
</script>

<template>
    <dropdown
        ref="dropdown"
        :items="listing.items"
        @change="(items, cancel_cb) => $emit('change', items, cancel_cb)"
        @open="loadNextBatch"
        @scroll-finished="loadNextBatch"
    >
        <slot/>
    </dropdown>
</template>
