<script>
import Api from "../services/Api.js";

import AddableDropdown from "./dropdowns/AddableDropdown.vue";
import DynamicDropdown from "./dropdowns/DynamicDropdown.vue";
import Dropdown from "./dropdowns/Dropdown.vue";

import Popup from "./popups/Popup.vue";

import OrderButton from "./OrderButton.vue";
import ImageExplorer from "./ImageExplorer.vue";
import ProductAccordions from "./accordions/ProductAccordions.vue";
import BulkActionPopup from "@/components/popups/BulkActionPopup.vue";

export default {
    emits: ["add-to-cart", "save", "order"],

    /**
     * @property {Object} product - The product to display.
     */
    props: {
        product: Object,
    },

    data() {
        return {
            isEditing: false,
            productChanges: {
                price: Number,
                model: String,
                brand: String,
                type: String,
                subtype: String,
                colors: new Map(),
                materials: new Map(),
                status: String,
                size: String,
                description: String
            },
            urlIdx: 0,
            productStatuses: ["DISABLED", "ACTIVE", "PENDING", "SOLD", "LOCKED"],
            imgMode: 0,
            channel: {}
        };
    },

    methods: {
        async setVCExport(e) {
            const value = e.target.checked;

            await Api.updateProduct({
                product_id: this.product.id,
                fields: {is_exported_vc: value},
            });

            this.product.is_exported_vc = value;
        },

        /**
         * Confirm if the user wants to order the product.
         * If so, send the order request to the API.
         * If not, do nothing.
         * Close the popup in both cases.
         * @emit save
         * @returns {Promise<void>}
         */
        async order() {
            if (!confirm(`Order product #${this.product.id}?`)) {
                return;
            }
            void this.$refs["confirm-order"].animate();

            const {data: {error}} = await Api.orderProduct({
                product_id: this.product.id,
                channel_id: this.channel.id,
            });

            if (error) {
                this.$refs["confirm-order"].enableButton();
                return alert(`Error: ${error}`);
            }

            this.product.status = "SOLD";

            this.$emit("save");

            await this.$refs["popup-order"].close();
        },

        /**
         * Convert cents to euros.
         * @param {Product} product
         * @param {string} priceType
         */
        formatPrice(product, priceType) {
            const priceDiscounted = priceType + "_discounted";
            const price = product[priceDiscounted] ? product[priceDiscounted] : product[priceType];
            return price === null ? "-" : (price / 100).toFixed(2) + "€";
        },

        /**
         * Reset the product changes to the default values in order to compare them later.
         * Set the editing mode to true.
         * Call the handleEdit method of the accordions component.
         */
        async editProduct() {

            const purchasePrice = this.product.purchase_price_cents_discounted ?
                this.product.purchase_price_cents_discounted : this.product.purchase_price_cents;

            this.productChanges = {
                model: this.product.model,
                price: purchasePrice / 100,
                size: Object.entries(this.product.size).map(([k, v]) =>
                    `${k}: ${v}`
                ).join("\n"),
                description: this.product.description,
                colors: Object.entries(this.product.colors)
                    .map(([id, data]) => ({...data, id})),
                materials: Object.entries(this.product.materials)
                    .map(([id, data]) => ({...data, id})),
                status: this.product.status,
            };

            this.isEditing = true;
        },

        /**
         * Check if the product has been modified by comparing the default values with the changes.
         * If so, send the update request to the API.
         * If there is an error, display it.
         * If not, set the editing mode to false
         */
        async saveProduct() {
            const fields = {};
            const inputPrice = Math.round(this.productChanges.price * 100);
            const color_ids = this.productChanges.colors.map(({id}) => id);
            const material_ids = this.productChanges.materials.map(({id}) => id);
            const purchasePriceCents = this.product.purchase_price_cents_discounted ?
                this.product.purchase_price_cents_discounted : this.product.purchase_price_cents;

            if (inputPrice !== purchasePriceCents)
                fields.purchase_price_cents = inputPrice;

            if (this.productChanges.model !== this.product.model)
                fields.model = this.productChanges.model;

            if (this.productChanges.brand_id !== this.product.brand_id)
                fields.brand_id = this.productChanges.brand_id;

            if (this.productChanges.type_id !== this.product.type_id)
                fields.type_id = this.productChanges.type_id;

            if (this.productChanges.subtype_id !== this.product.subtype_id)
                fields.subtype_id = this.productChanges.subtype_id;

            if (this.productChanges.status !== this.product.status)
                fields.status = this.productChanges.status;

            if (Object.keys(this.product.colors).join() != color_ids.join())
                fields.color_ids = color_ids;

            if (Object.keys(this.product.materials).join() != material_ids.join())
                fields.material_ids = material_ids;

            if (isNaN(fields.purchase_price_cents))
                delete fields.purchase_price_cents;

            if (this.productChanges.size !== this.product.size)
                fields.size = Object.fromEntries(
                    this.productChanges.size
                        .split("\n")
                        .filter(line => line.includes(":"))
                        .map(line => line.split(":").map(s => s.trim()))
                        .filter(([k, v, extra]) => k && v && extra === undefined)
                );

            if (this.productChanges.description !== this.product.description)
                fields.description = this.productChanges.description;

            const {error} = await Api.updateProduct({
                product_id: this.product.id,
                fields,
            });

            if (error)
                return alert("Error: " + error);

            this.isEditing = false;
            this.$emit("save");
        },

        /**
         * Change the image mode.
         * @param {String} url
         */
        changeImgMode(url) {
            if (this.imgMode === 0)
                return url;

            const urlSplit = url.split("/");
            return `${urlSplit.slice(0, -1).join("/")}/${
                this.imgMode === 1 ? "u2net" : "u2netp"
            }/${urlSplit.slice(-1)}.png`;
        },

        /**
         * Open the order popup.
         */
        openOrderPopup() {
            this.$refs["popup-order"].open();
        },

        /**
         * Close the order popup.
         */
        closeOrderPopup() {
            this.$refs["popup-order"].close();
        },

        async listAvailableTags({prev_id, batch_size}) {
            const result = await Api.listTags({prev_id, batch_size});

            if (result.data.items)
                result.data.items = result.data.items.filter(
                    ({products_group: {is_system}}) => !is_system
                );

            return result;
        },

        async setProductTags(tags, cancel_cb) {
            const ids = new Set(tags.map(({id}) => id));

            const {data: {error}} = await Api.setProductTags(
                this.product.id,
                [...ids]
            );

            if (error) {
                cancel_cb();
                return alert("Error: " + error);
            }

            this.product.tags = Object.fromEntries(tags.map(
                ({id, ...data}) => [id, data]
            ));
        },

        async addToExportingShop() {
            this.$refs["exporting-shop-popup"].open();
        },

        async pickExportingShop(shop) {
            const {data: {count, error}} = await Api.addShopExportedProducts(
                shop.id, [this.product.id]
            );

            if (error)
                return this.$root.showToast(
                    "Error: " + error,
                    {type: "error"}
                );

            this.$root.showToast(
                count ? "Product added to shop" : "Product is already in shop",
                {type: count ? "success" : "info"}
            );
        },
    },

    mounted() {
        if (this.product && this.$refs["tags-dropdown"])
            this.$refs["tags-dropdown"].items = new Map(
                Object.entries(this.product.tags || {})
                    .map(([id, data]) => [+id, {id: +id, ...data}])
            );
    },

    watch: {
        product(product) {
            this.isEditing = false;

            if (!product) {
                return;
            }

            this.$refs["imageExplorer"]?.reset();
            if (this.$refs["tags-dropdown"])
                setTimeout(() => {
                    this.$refs["tags-dropdown"].items = new Map(
                        Object.entries(product.tags)
                            .map(([id, data]) => [+id, {id: +id, ...data}])
                    );
                }, 0);
        }
    },

    components: {
        BulkActionPopup,
        AddableDropdown,
        DynamicDropdown,
        Dropdown,
        OrderButton,
        ImageExplorer,
        ProductAccordions,
        Popup,
    },
};
</script>

<template>
    <popup ref="popup-order" class="choose-order-card">
        <h1>
            Order Options
        </h1>
        <h2>
            On channel
        </h2>
        <dynamic-dropdown
            :listing-function="Api.listChannels"
            @change="channels => this.channel = channels[0]"
        >Choose channel</dynamic-dropdown>
        <div>
            <h2>Recap</h2>
            <p>Product: {{ product?.name }}</p>
            <p>Product ID: {{ product?.id }}</p>
            <p>Product status: {{ product?.status }}</p>
            <p>Price: {{ product ? formatPrice(product, "purchase_price_cents") : "" }}</p>
        </div>
        <div class="choose-order-actions">
            <button type="button" class="danger" @click="closeOrderPopup">Cancel</button>
            <order-button
                v-if="Object.values(this.channel).length && product?.status === 'ACTIVE'"
                :productId="product?.id"
                ref="confirm-order"
                @click="order"
            />
        </div>
    </popup>
    <bulk-action-popup
        ref="exporting-shop-popup"
        entity-name="shop"
        :listing-function="({prev_id, batch_size}) => Api.listShops({
            is_exporting: 1,
            prev_id,
            batch_size
        })"
        @select="pickExportingShop"
    />
    <div class="product-description" v-if="product">
        <div class="product-img">
            <div class="img-ai-panel">
                <div class="ai-panel-button-container">
                    <button
                        class="img-ai-panel mode-default"
                        :disabled="imgMode === 0"
                        @click="() => { imgMode = 0; }"
                    />
                    <button
                        class="img-ai-panel mode-one"
                        :disabled="imgMode === 1"
                        @click="() => { imgMode = 1; }"
                    />
                    <button
                        class="img-ai-panel mode-two"
                        :disabled="imgMode === 2"
                        @click="() => { imgMode = 2; }"
                    />
                </div>
            </div>
            <div
                class="product-img-main"
                :style="{background:`center / contain no-repeat url(${changeImgMode(product.image_urls[urlIdx])})`}"
                @click="$refs.imageExplorer.open()"
            ></div>
            <div class="product-img-panel">
                <div
                    v-for="(url, i) in product.image_urls"
                    :class="{selected: urlIdx == i}"
                    :style="{background: `center / contain no-repeat url(${url})`}"
                    @click="urlIdx = i"
                />
            </div>
        </div>
        <div class="product-fields">
            <h1>
                {{ product.name.toUpperCase() }}
            </h1>
            <table class="product-main-info">
                <tbody>
                    <tr :class="{'mobile-field': isEditing}">
                        <th class="info-title">ID</th>
                        <td>#{{ product.id }}</td>
                    </tr>
                    <tr v-if="product?.vendor && Api.user?.permissions.has('ADMIN')" class="mobile-field-hidden">
                        <th class="info-title">Vendor</th>
                        <td class="product-vendor">{{ product.vendor }}</td>
                    </tr>
                    <tr v-if="Api.user?.permissions.has('PRODUCT_SHOW_STATUS')" class="mobile-field-hidden">
                        <th class="info-title">Status</th>
                        <td v-if="isEditing && Api.user?.permissions.has('PRODUCT_EDIT_STATUS')">
                            <dropdown
                                class="product-status-dropdown"
                                v-model:value="productChanges.status"
                                :items="productStatuses.map(name => ({id: name, name}))"
                            />
                        </td>
                        <td v-else>
                            <span
                                class="product-status"
                                :class="{['product-status-' + product.status.toLocaleLowerCase()]: 1}"
                            >
                                {{ product.status }}
                            </span>
                        </td>
                    </tr>
                    <tr v-if="product?.brand" :class="{'mobile-field': isEditing}">
                        <th class="info-title">Brand</th>
                        <td v-if="isEditing">
                            <addable-dropdown
                                name="brand"
                                :adding-function="Api.createBrand"
                                :listing-function="Api.listBrands"
                                @change="brand => productChanges.brand_id = brand.id"
                                is-searchable
                            />
                        </td>
                        <td v-else>{{ product.brand?.name }}</td>
                    </tr>
                    <tr v-if="product?.grade && !isEditing">
                        <th class="info-title">Grade</th>
                        <td>{{ product.grade }}</td>
                    </tr>
                    <tr v-if="product?.purchase_price_cents !== undefined || isEditing">
                        <th class="bold info-title">Purchase price{{ isEditing ? " (€)" : "" }}</th>
                        <td v-if="isEditing">
                            <input class="price-input" type="number" step=".01" v-model="productChanges.price" />
                        </td>
                        <td class="bold" v-if="product?.purchase_price_cents !== undefined && !isEditing">
                            {{ formatPrice(product, "purchase_price_cents") }}
                        </td>
                    </tr>
                    <tr v-if="product?.wholesale_price_cents !== undefined && !isEditing">
                        <th class="bold info-title">Wholesale price</th>
                        <td class="bold">
                            {{ formatPrice(product, "wholesale_price_cents") }}
                        </td>
                    </tr>
                    <tr v-if="product?.retail_price_cents !== undefined && !isEditing">
                        <th class="bold info-title">Retail price</th>
                        <td class="bold">
                            {{ formatPrice(product, "retail_price_cents") }}
                        </td>
                    </tr>
                    <tr v-if="product?.is_exported_vc !== undefined && Api.user?.permissions.has('ADMIN')"
                        class="mobile-field-hidden">
                        <th class="info-title">VC export</th>
                        <td>
                            <input
                                type="checkbox"
                                class="switch"
                                :checked="product.is_exported_vc"
                                @change="setVCExport"
                            />
                        </td>
                    </tr>
                    <tr v-if="Api.user" class="tags-row">
                        <th class="info-title">Tags</th>
                        <td>
                            <addable-dropdown
                                ref="tags-dropdown"
                                is-multiple
                                name="tag"
                                :adding-function="Api.createTag"
                                :listing-function="listAvailableTags"
                                :deletable-function="data => data.owner_id"
                                @change="setProductTags"
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
            <product-accordions
                ref="accordions"
                :product="product"
                :product-changes="productChanges"
                :is-editing="isEditing"
            />
            <div class="product-actions">
                <template v-if="isEditing">
                    <button @click="isEditing = false">Cancel</button>
                    <button class="success" @click="saveProduct()">Save</button>
                </template>
                <template v-else>
                    <button
                        v-if="Api.user?.permissions.has('PRODUCT_UPDATE')"
                        class="blue"
                        @click="editProduct"
                        >Edit</button>
                    <button
                        class="success"
                        v-if="Api.user?.permissions.has('ADMIN')"
                        :disabled="product.status !== 'ACTIVE'"
                        @click="openOrderPopup"
                    >Order</button>
                    <button
                        v-if="Api.user?.permissions.has('CART_ADD_PRODUCT')"
                        class="purple"
                        :disabled="product.status !== 'ACTIVE'"
                        @click="() => $emit('add-to-cart', product)"
                    >Add to cart</button>
                    <button
                        v-if="Api.user"
                        class="indigo"
                        @click="addToExportingShop"
                    >Export to shop</button>
                    <a
                        v-if="product?.original_url && Api.user?.permissions.has('ADMIN')"
                        :href="product?.original_url"
                        target="_blank"
                        class="button"
                    >
                        Open
                    </a>
                </template>
            </div>
        </div>
    </div>
    <image-explorer v-if="product" :product="product" ref="imageExplorer" />
</template>

<style>

.choose-order-actions > .danger {
    color: var(--danger-red);
}

.choose-order-actions > .danger:hover {
    color: var(--white-grey);
}

.tags-row button:hover.add-button {
    border-color: var(--black-grey);
    background-color: var(--black-grey);
}

.product-actions {
    display: flex;
    margin-top: 20px;
    gap: 10px;
    width: 100%;
    flex-direction: column;
}
.product-actions > button,
.product-actions > .button {
    border-radius: 10px;
    width: 100%;
}

.product-description {
    display: flex;
    max-width: fit-content;
    flex-wrap: wrap;
    justify-content: center;
    flex-direction: row;
    margin: 0 auto;
}

.product-img {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 500px;
}

.product-main-info {
    padding-bottom: 5px;
}

.product-main-info .info-title {
    font-family: Avenue_Mono;
}

.product-description .product-img-main {
    width: 500px;
    height: 500px;
    background-position: center;
    background-size: cover;
    border-radius: 5px;
    background-color: var(--grey);
    box-shadow: inset 0 0 10px #0002;
    cursor: pointer;
}

.product-description .product-img-panel {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    margin: 5px 0;
    gap: 6px;
}

.product-description .product-img-panel > div {
    width: 45px;
    height: 45px;
    background-position: center;
    background-size: cover;
    border-radius: 2px;
    background-color: var(--grey);
    opacity: .4;
    cursor: pointer;
    transition: opacity ease-in-out .1s;
}
.product-description .product-img-panel > div.selected {
    opacity: 1;
}
.product-description .product-fields {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    padding: 0px 20px;
    justify-content: center;
}
.product-description .product-fields > h1 {
    margin: 0;
    font-size: 16pt;
    display: flex;
    justify-content: center;
    border-bottom: 2px solid var(--see-through-grey);
    padding-bottom: 10px;
}
.product-description .product-fields td {
    white-space: pre-wrap;
    max-width: 300px;
}
.product-description .product-fields table:first-of-type {
    border-bottom: 2px solid var(--see-through-grey);
}
.product-description .product-fields table {
    width: 100%;
}
.product-description .product-fields table th {
    white-space: nowrap;
    text-align: left;
    padding: 10px 10px 10px 0;
}
.product-description .row-tag {
    display: flex;
    flex-direction: column;
    margin: 10px;
}

.product-status {
    --status-text-color: var(--black-grey);
    --status-bg-color: var(--light-grey-2);
    padding: 2px 20px;
    border-radius: 10px;
    color: var(--status-text-color);
    background: var(--status-bg-color);
}
.product-status-active {
    --status-text-color: var(--white-color);
    --status-bg-color: var(--success-green);
}
.product-status-pending {
    --status-text-color: var(--brown);
    --status-bg-color: var(--beige);
}
.product-status-sold {
    --status-text-color: var(--white-color);
    --status-bg-color: var(--success-green);
}
.product-status-disabled {
    --status-text-color: var(--light-brown);
    --status-bg-color: var(--danger-red);
}
.product-status-locked {
    --status-text-color: var(--white-color);
    --status-bg-color: var(--pink);
}

.product-fields .product-status-dropdown {
    width: 185px;
    height: 40px;
}

@supports (-webkit-background-clip: text) {
    .product-fields .product-vendor {
        background: linear-gradient(90deg, #ffba00 0%, #ff6c00 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: bold;
    }
}

.product-description .bold {
    font-weight: bold;
}

.add-to-cart-button {
    display: flex;
    justify-content: center;
    --color: var(--bright-orange);
}

.add-to-cart-button:hover {
    background-color: var(--regular-orange);
}

.add-to-cart-button:disabled {
    background-color:  var(--salmon-orange);
    cursor: not-allowed;
}

.button-icon {
    background-image: url("/icons/add-shopping-cart.svg");
    background-size: contain;
    width: 20px;
    height: 20px;
    animation: cart-icon-animation 1s infinite;
}

.popup .choose-order-card {
    display: flex;
    position: relative;
    flex-wrap: wrap;
    flex-direction: column;
    width: 300px;
    margin-top: 20vh;
    gap: 24px;
    height: 380px;
}
.popup .choose-order-card h1 {
    align-self: center;
}
.popup .choose-order-actions {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding-top: 10px;
    gap: 5px;
    bottom: 10px;
    left: 0;
    right: 0;
}

@keyframes cart-icon-animation {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.2);
    }
    100% {
        transform: scale(1);
    }
}

.product-img .img-ai-panel {
    display: flex;
    justify-content: center;
    margin-bottom: 10px;
}

.product-img .ai-panel-button-container {
    display: flex;
    gap: 25px;
}

.product-img .ai-panel-button-container > button:hover {
    background-color: transparent;
}

.product-img .ai-panel-button-container > button {
    border: none;
    opacity: .4;
}

.product-img .ai-panel-button-container > button:disabled {
    opacity: .8;
    background-color: transparent;
}

.img-ai-panel .mode-default,
.img-ai-panel .mode-one,
.img-ai-panel .mode-two {
    background-size: contain;
    background-repeat: no-repeat;
    width: 65px;
    height: 65px;
}

.img-ai-panel .mode-default {
    background-image: url("/icons/model-default.svg");
}

.img-ai-panel .mode-one {
    background-image: url("/icons/model-1.svg");
}

.img-ai-panel .mode-two {
    background-image: url("/icons/model-2.svg");
}

@media only screen and (max-width: 800px) {
    .product-description {
        flex-direction: column;
        width: 100%;
        gap: 10px;
    }

    .product-description .product-img-main {
        width: 300px;
        height: 300px;
    }
    .product-fields {
        width: 100%;
        margin-top: 0;
    }
    .product-fields .mobile-field-hidden {
        display: none;
    }
    .mobile-field > td,
    .mobile-field {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .product-main-info tr {
        display: block;
    }

    .product-img {
        width: 100%;
    }
    .product-description .product-fields {
        padding: 20px 0;
    }

    .product-description .product-img-panel {
        max-width: 300px;
    }
}

</style>
