<script>
import Api from "../services/Api.js";
import Dropdown from "./dropdowns/Dropdown.vue";
import BulkActionPopup from "./popups/BulkActionPopup.vue";

export default {
    emits: [
        "selection-cleared",
        "action-finished"
    ],

    props: {
        bulkActions: {
            type: String,
            default: ""
        },
        productIds: {
            type: Set,
            default: new Set
        },
        extraBulkActions: {
            type: Array,
            default: []
        }
    },

    data() {
        return {
            bulkActionsSet: new Set(this.bulkActions.split(" ")),
            bulkAction: null,
            BULK_ACTIONS: [
                {
                    id: "add-tag",
                    name: "Add tag...",
                    callback: () => {
                        this.$refs["tag-popup"].open();
                    }
                },
                {
                    id: "remove-tag",
                    name: "Remove tag...",
                    callback: () => {
                        this.$refs["tag-popup"].open();
                    }
                },
                {
                    id: "add-to-exporting-shop",
                    name: "Export to shop...",
                    callback: () => {
                        this.$refs["exporting-shop-popup"].open();
                    }
                },
                {
                    id: "remove-from-exporting-shop",
                    name: "Remove exported from shop...",
                    callback: () => {
                        this.$refs["exporting-shop-popup"].open();
                    }
                },
                {
                    id: "add-to-marketplace",
                    name: "Export to marketplace...",
                    callback: () => {
                        this.$refs["exporting-marketplace-popup"].open();
                    }
                },
                ...this.extraBulkActions.map(data =>
                    ({...data, is_default: true})
                ),
                {
                    id: "copy-ids",
                    name: "Copy product IDs",
                    is_default: true,
                    callback: () => {
                        const {size} = this.productIds;

                        navigator.clipboard.writeText(
                            [...this.productIds].join(", ")
                        );
                        this.$root.showToast(
                            `${size} product ID`
                            + (size == 1 ? " was" : "s were")
                            + " copied to clipboard",
                            {type: "info"}
                        );
                    }
                },
            ]
        };
    },

    computed: {
        shownActions() {
            return this.BULK_ACTIONS.filter(({id, is_default}) =>
                is_default || this.bulkActionsSet.has(id)
            );
        },

        tagActions() {
            return this.BULK_ACTIONS.filter(({name}) => name.includes("tag"));
        },

        exportActions() {
            return this.BULK_ACTIONS.filter(({id}) => id.toUpperCase().includes("EXPORT"));
        }
    },

    methods: {
        copyIds() {
            this.BULK_ACTIONS.filter(({id, callback}) => id === "copy-ids" ? callback(this.productIds) : "");
        },

        async editTagProducts(tag) {
            const {handler, message_parts, toast_type} = {
                "add-tag": {
                    handler: Api.addProductTags,
                    message_parts: ["Assigned", "to"],
                    toast_type: "success"
                },
                "remove-tag": {
                    handler: Api.removeProductTags,
                    message_parts: ["Removed", "from"],
                    toast_type: "info"
                },
            }[this.bulkAction];

            const {data: {count}} = await handler(tag.id, [...this.productIds]);

            this.$root.showToast(
                [
                    message_parts[0],
                    "tag",
                    tag.name,
                    message_parts[1],
                    count,
                    (count == 1 ? "product" : "products")
                ].join(" "),
                {type: toast_type}
            );

            this.$emit("action-finished", this.bulkAction);
        },

        async editShopProducts(shop) {
            const {handler, message_parts, toast_type} = {
                "add-to-exporting-shop": {
                    handler: Api.addShopExportedProducts,
                    message_parts: ["Added", "to"],
                    toast_type: "success"
                },
                "remove-from-exporting-shop": {
                    handler: Api.removeShopExportedProducts,
                    message_parts: ["Removed", "from"],
                    toast_type: "info"
                },
            }[this.bulkAction];

            const {data: {count, error}} = await handler(
                shop.id, [...this.productIds]
            );

            if (error)
                return this.$root.showToast(
                    "Error: " + error,
                    {type: "error"}
                );

            this.$root.showToast(
                [
                    message_parts[0],
                    count || 0,
                    (count == 1 ? "product" : "products"),
                    message_parts[1],
                    "shop",
                    shop.name,
                ].join(" "),
                {type: count ? toast_type : "info"}
            );

            this.$emit("action-finished", this.bulkAction);
            this.$router.push({path: "/shops/" + shop.id});
        },

        async addMarketplaceProducts(shop) {
            const {data: {count}} = await Api.addMarketplaceExportedProducts(
                shop.id, [...this.productIds]
            );

            this.$root.showToast(
                [
                    "Added",
                    count || 0,
                    (count == 1 ? "product" : "products"),
                    "to marketplace",
                    shop.name,
                ].join(" "),
                {type: count ? "success" : "info"}
            );

            this.$emit("action-finished", this.bulkAction);
        },

        selectBulkAction([{id, callback}], cancel_cb) {
            this.bulkAction = id;

            cancel_cb();
            callback(this.productIds);
        }
    },

    components: {
        Dropdown,
        BulkActionPopup,
    }
};
</script>

<template>
    <bulk-action-popup
        ref="tag-popup"
        entity-name="tag"
        manage-page="/tags"
        :listing-function="Api.listTags"
        @select="editTagProducts"
    />
    <bulk-action-popup
        ref="exporting-shop-popup"
        entity-name="shop"
        :listing-function="({prev_id, batch_size}) => Api.listShops({
            is_exporting: 1,
            prev_id,
            batch_size
        })"
        @select="editShopProducts"
    />
    <bulk-action-popup
        ref="exporting-marketplace-popup"
        entity-name="marketplace"
        :listing-function="({prev_id, batch_size}) => Api.listMarketplaces({
            prev_id,
            batch_size
        })"
        @select="addMarketplaceProducts"
    />
    <div class="bulk-actions-dropdown" :class="{shown: productIds.size}">
        <dropdown
            :items="tagActions"
            @change="selectBulkAction"
        >Add Tag...</dropdown>
        <dropdown
            :items="exportActions"
            @change="selectBulkAction"
        >Export to shop...</dropdown>
        <button class="copy-button" @click="copyIds">Copy Ids</button>
        <p>
            {{productIds.size}} product{{ productIds.size == 1 ? "" : "s" }} selected
        </p>
        <button
            class="clear-products-button"
            @click="() => $emit('selection-cleared')"
        >&times;</button>
    </div>
</template>

<style>
.bulk-actions-dropdown {
    background: var(--white-grey);
    border-radius: 5px;
    visibility: collapse;
    display: flex;
    align-items: center;
    opacity: 0;
    transform: translateX(5px);
    transition: all .2s ease-in-out;
    max-height: 30px;
}

.bulk-actions-dropdown .dropdown {
    height: 30px;
    padding: 3px 15px;
}
.bulk-actions-dropdown .dropdown h1 {
    font-size: 14px;
}
.bulk-actions-dropdown .copy-button {
    font-weight: normal;
    height: 30px;
    padding: 3px 15px;
    font-size: 14px;
}
.bulk-actions-dropdown .copy-button:hover {
    background-color: var(--light-grey-0);
    color: var(--light-grey-1);
}
.bulk-actions-dropdown.shown {
    visibility: visible;
    opacity: 1;
    transform: none;
    margin-right: 15px;
}
.bulk-actions-dropdown p {
    margin: 0 0 0 15px;
    text-align: right;
}
.bulk-actions-dropdown .clear-products-button {
    font-size: 16pt;
    font-weight: normal;
    padding: 5px 10px;
    border: none;
    background: none;
}
.bulk-actions-dropdown button.clear-products-button:hover {
    color: var(--light-grey-2);
}
</style>
