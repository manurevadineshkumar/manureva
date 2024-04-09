<script>
import ProductsList from "../components/ProductsList.vue";
import ProductPopup from "../components/popups/ProductPopup.vue";

import Api from "../services/Api";

export default {
    data() {
        return {
            tagsName: ["timeless chanel", "vintage", "monogram", "black bags", "small bags", "classics"],
            korvinSelectionTags: [],
            query: {},
            activeStates: {},
            userTags: [],
        };
    },

    methods: {
        async loadData() {
            this.userTags = await Api.listUserTags(2);
        },

        resetActiveStates() {
            for (const tag of this.tagsName) {
                this.activeStates[tag] = false;
            }
        },

        async changeSelection(tag) {
            const userTags = await Api.listUserTags(2);
            this.korvinSelectionTag = userTags.data.filter(userTag => userTag.tag_name === tag);

            this.resetActiveStates();
            this.activeStates[tag] = true;

            const query = {tag_ids: this.korvinSelectionTag[0].tag_id};
            this.query = query;
            this.$router.push({path: "/selection", query: query});
        }
    },

    async mounted() {
        await this.loadData();
        this.resetActiveStates();
        const initialSelection = this.userTags.data.filter(
            tag => tag.tag_id === parseInt(this.$route.query.tag_ids[0]));
        this.activeStates[initialSelection[0].tag_name] = true;
    },

    components: {
        ProductsList,
        ProductPopup
    }
};
</script>

<template>
<div class="selection-page">
    <product-popup
        ref="product-popup"
        @reload="$refs['products-list'].reloadProducts();"
        @switch-product="delta => $refs['products-list'].openOtherProduct(delta)"
    />
    <div class="selection-buttons">
        <template v-for="tag in tagsName"
            :key="tag">
                <button
                    @click="() => changeSelection(tag)"
                    :class="activeStates[tag] ? 'current' : ''"
                    >
                    {{ tag.toUpperCase() }}
                </button>
        </template>
        <a href="/products">Show all products</a>
    </div>
    <ProductsList
        ref="products-list"
        class="products-list"
        columns="id name brand colors materials prices"
        bulk-actions="add-tag remove-tag add-to-exporting-shop remove-from-exporting-shop add-to-marketplace"
        @open-product="(p) => $refs['product-popup'].openProduct(p)"
    />
</div>
</template>

<style>
.selection-page .products-list {
    height: 80vh;
}
.selection-page .button-settings {
    display: none;
}

.selection-page .filter-settings {
    font-size: 14px;
}

.selection-page .filter-settings .bulk-actions-dropdown {
    font-size: 13px;
}

.selection-page .filter-settings .bulk-actions-dropdown .dropdown > h1 {
    font-size: 14px;
}

.selection-page .selection-buttons {
    background-color: var(--see-through-grey);
    font-family: Avenue_Mono;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
    gap: 20px;
    padding-top: 10px;
    padding-bottom: 10px;
    padding-left: 50px;
}
.selection-page .selection-buttons button {
    background-color: transparent;
    font-size: 14px;
    font-weight: lighter;
    border: none;
    border-radius: 10px;
    padding: 8px 10px;
}

.selection-page .selection-buttons button.current,
.selection-page .selection-buttons button:hover {
    background-color: transparent;
    color: var(--dark-grey);
    border: 1px solid var(--dark-grey);
    border-radius: 10px;
}

.selection-page .selection-buttons a {
    color: var(--light-grey-1);
    padding-top: 20px;
    font-style: italic;
    text-decoration: underline;
    font-size: 14px;
}

.not-on-mobile.button-settings.filters {
    display: none;
}

.selection-page .products-list .filter-settings.hidden {
    height: 0px;
    padding: 0px;
}

@media only screen and (max-width: 800px) {
    .selection-page .selection-buttons button {
        font-size: 10px;
        font-weight: lighter;
        border-width: 0.5px;
        padding: 5px 12px;
    }

    .selection-page .selection-buttons {
        padding-right: 50px;
        justify-content: center;
    }

    .selection-page .selection-buttons a {
        padding-top: 10px;
        font-size: 8px;
    }

    .selection-page .filter-settings .bulk-actions-dropdown {
        font-size: 10px;
        padding-right: 50px;
        margin-right: 0px;
    }

    .selection-page .filter-settings .bulk-actions-dropdown .dropdown {
        min-width: 110px;
        padding: 5px 10px;
    }

    .selection-page .filter-settings .bulk-actions-dropdown .dropdown > h1 {
        font-size: 10px;
    }

    .selection-page .filter-settings .bulk-actions-dropdown > p {
        font-size: 9px;
    }
}

</style>
