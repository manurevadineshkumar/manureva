<script>
import Api from "../../services/Api.js";

import Popup from "./Popup.vue";

import AddableDropdown from "../dropdowns/AddableDropdown.vue";

export default {
    emits: ["save"],
    data() {
        return {
            product: {},
            images: []
        };
    },

    computed: {
        Api() {
            return Api;
        }
    },

    methods: {
        /**
         * Initialize a simple product that the user will complete in order to create a new product.
         * Open the popup.
         */
        open() {
            this.product = {
                status: "PENDING",
                name: "",
                gender: 0,
                type_id: null,
                subtype_id: null,
                model: "",
                brand_id: null,
                description: "",
                bought_price: 0,
                bought_currency: "JPY",
                grade: "B",
                size: "",
                color_ids: [],
                material_ids: [],
                has_serial: 0,
                has_guarantee_card: 0,
                has_box: 0,
                has_storage_bag: 0,
                is_exported_vc: 0
            };

            this.$refs.popup.open();
        },

        /**
         * Convert the bought price to a cents number.
         * Send the product object to the API to create it.
         * It will return an error or the created product.
         * It shows a toast error message if there is an error in the creation of a product.
         * Create a FormData object to send the images of the product to the API.
         * It shows a toast error message if there is an error in the creation of the images.
         * Reset the images array.
         * Close the popup.
         */
        async createProduct() {
            this.product.bought_price_cents = this.product.bought_price * 100;

            const {size: size_str, ...data} = this.product;
            const size_obj = size_str
                ? Object.fromEntries(size_str
                    .split("\n")
                    .filter(line => line.includes(":"))
                    .map(line => line.split(":").map(s => s.trim()))
                    .filter(([k, v, extra]) => k && v && extra === undefined)
                )
                : {};

            const {
                data: {
                    error: product_error,
                    product
                }
            } = await Api.createProduct({product: {...data, size: size_obj}});

            if (product_error)
                return this.$root.showToast(
                    `Error: ${product_error}`,
                    {
                        type: "error",
                        duration: 3000
                    }
                );

            const form_data = new FormData();

            this.images.forEach(({file}) => form_data.append("images", file));

            const {data: {error: img_error}} = await Api.addImagesToProduct({
                product_id: product.id,
                images: form_data,
            });

            if (img_error)
                return this.$root.showToast(
                    `Error: ${product_error}`, {
                        type: "error",
                        duration: 3000
                    }
                );

            this.images = [];
            this.$emit("save");
            await this.$refs.popup.close();
        },

        /**
         * Load the image blob to display it in the preview.
         * @param {file} file
         */
        async loadImageBlob(file) {
            const img = new Image();
            const blob = URL.createObjectURL(file);

            img.src = blob;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            return blob;
        },

        /**
         * Add the images to the images array in order to display them and to send them to the API.
         * @param {File[]} files
         */
        async addImages(files) {
            this.images.push(
                ...await Promise.all(
                    [...files].map(async file => ({
                        file,
                        blob: await this.loadImageBlob(file)
                    }))
                )
            );
        },

        /**
         * Remove an image from the images array by index
         * @param index {Number}
         */
        deleteImage(index) {
            this.images.splice(index, 1);
        }
    },

    components: {
        Popup,
        AddableDropdown
    }
};
</script>

<template>
    <popup ref="popup" class="new-product-popup">
        <h1>New Product</h1>
        <form class="new-product-form" @submit.prevent="createProduct">
            <label for="status">Status</label>
            <select v-model="product.status" id="status">
                <option>DISABLED</option>
                <option>ACTIVE</option>
                <option>PENDING</option>
                <option>SOLD</option>
            </select>
            <label>Images</label>
            <input type="file" accept="image/*" multiple required @change="e => addImages(e.target.files)">
            <div v-if="images.length" class="images-gallery">
                <div v-for="(image, i) in images" :key="i" class="gallery-image">
                    <img alt="Product image" :src="image.blob">
                    <span class="delete-icon" @click="() => deleteImage(i)">&times;</span>
                </div>
            </div>
            <label for="name">Name</label>
            <input type="text" id="name" v-model="product.name" minlength="3" required>
            <label for="type">Type</label>
            <addable-dropdown
                name="type"
                :adding-function="Api.createType"
                :listing-function="Api.listTypes"
                @change="type => product.type_id = type.id"
                is-searchable
            />
            <input :value="product.type_id" class="hidden-input" tabindex="-1" required>
            <label for="subtype">Subtype</label>
            <addable-dropdown
                name="subtype"
                :adding-function="Api.createSubtype"
                :listing-function="Api.listSubtypes"
                @change="subtype => product.subtype_id = subtype.id"
                is-searchable
            />
            <label for="description">Description</label>
            <input type="text" id="description" v-model="product.description">
            <label for="size">Size</label>
            <textarea v-model="product.size" required/>
            <label>Colors</label>
            <addable-dropdown
                is-multiple
                name="color"
                :adding-function="Api.createColor"
                :listing-function="Api.listColors"
                @change="colors => product.color_ids = colors.map(({id}) => id)"
                is-searchable
            />
            <label>Materials</label>
            <addable-dropdown
                is-multiple
                name="material"
                :adding-function="Api.createMaterial"
                :listing-function="Api.listMaterials"
                @change="materials => product.material_ids = materials.map(({id}) => id)"
                is-searchable
            />
            <label for="gender">Gender</label>
            <select v-model.number="product.gender" id="gender" class="small">
                <option value="1">Male</option>
                <option value="0">Female</option>
            </select>
            <label for="model">Model</label>
            <input type="text" id="model" v-model="product.model">
            <label for="brand">Brand</label>
            <addable-dropdown
                name="brand"
                :adding-function="Api.createBrand"
                :listing-function="Api.listBrands"
                @change="brand => product.brand_id = brand.id"
                is-searchable
            />
            <input :value="product.brand_id" class="hidden-input" tabindex="-1" required>
            <label>Grade</label>
            <select v-model="product.grade">
                <option>A</option>
                <option>AB</option>
                <option>B</option>
                <option>BC</option>
                <option>C</option>
                <option>CD</option>
                <option>D</option>
            </select>
            <label>Bought price</label>
            <div class="price-row">
                <input type="number" v-model.number="product.bought_price" min="30" required>
                <select v-model="product.bought_currency" required>
                    <option>JPY</option>
                    <option>EUR</option>
                </select>
            </div>
            <label><input type="checkbox" v-model.number="product.has_serial"> Has serial</label>
            <label><input type="checkbox" v-model.number="product.has_box"> Has box</label>
            <label><input type="checkbox" v-model.number="product.has_guarantee_card"> Has guarantee card</label>
            <label><input type="checkbox" v-model.number="product.has_storage_bag"> Has storage bag</label>
            <button class="success">Create</button>
        </form>
    </popup>
</template>

<style>
.new-product-popup {
    min-width: min(600px, 90%);
}
.new-product-popup > h1 {
    font-size: 16pt;
    text-align: center;
    margin: 10px 0;
}
.new-product-form {
    position: relative;
    display: flex;
    flex-direction: column;
}
.new-product-form label {
    display: flex;
    align-items: center;
    margin: 10px 0 5px 0;
}
.new-product-form > input {
    box-sizing: border-box;
    width: 100%;
}
.new-product-form > .hidden-input {
    margin-top: -40px;
    z-index: -10;
    opacity: 0;
    pointer-events: none;
}
.new-product-form input[type=checkbox] {
    width: inherit;
    margin-right: 10px;
}
.new-product-form > input[type=file] {
    cursor: pointer;
    color: transparent;
}
.new-product-form > input[type=file]::before {
    content: "Add images...";
    display: block;
    position: absolute;
    color: var(--light-grey-2);
}
.new-product-form > .price-row {
    display: flex;
    gap: 10px;
}
.new-product-form > .price-row > input {
    flex: 1;
}
.new-product-form ::file-selector-button {
    display: none;
}
.new-product-form > button {
    margin: 15px 0 5px 0;
}

.images-gallery {
    display: flex;
    gap: 10px;
    margin: 10px 0 0 0;
    max-width: none;
}
.gallery-image {
    position: relative;
    max-width: 100px;
    max-height: 100px;
    border-radius: 5px;
    background: var(--see-through-black-1);
}
.images-gallery img {
    max-width: 100px;
    max-height: 100px;
}
.delete-icon {
    display: flex;
    position: absolute;
    width: 20px;
    height: 20px;
    top: 0;
    right: 0;
    font-size: 16pt;
    background: var(--see-through-black-1);
    color: var(--danger-red);
    cursor: pointer;
    align-items: center;
    justify-content: center;
    border-radius: 0 5px 0 0;
    transition: background .2s ease-in-out, color .2s ease-in-out;
}
.delete-icon:hover {
    background: #f006;
    color: #0006;
}
</style>
