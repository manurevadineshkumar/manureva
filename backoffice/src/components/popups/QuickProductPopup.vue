<script>
import Api from "../../services/Api.js";

import Popup from "./Popup.vue";
import AddableDropdown from "../dropdowns/AddableDropdown.vue";

export default {
    emits: ["save"],
    data() {
        return {
            product: {
                status: "PENDING",
                name: "",
                gender: 0,
                type_id: null,
                subtype_id: null,
                model: "",
                brand_id: null,
                description: "-- Made in: \n-- batch / lot: \n",
                size: "",
                bought_price: 1000,
                bought_currency: "JPY",
                grade: "A",
                color_ids: [],
                material_ids: [],
                has_serial: 0,
                has_guarantee_card: 0,
                has_box: 0,
                has_storage_bag: 0,
                is_exported_vc: 0
            },
            images: []
        };
    },

    computed: {
        Api() {
            return Api;
        }
    },

    methods: {
        open() {
            this.$refs.popup.open();
        },

        async createProduct() {
            this.$root.showToast("Creating product...", {
                type: "info",
                duration: 2000
            });

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
                return alert("Error: " + product_error);

            const form_data = new FormData();

            this.images.forEach(({file}) => form_data.append("images", file));

            const {data: {error: img_error}} = await Api.addImagesToProduct({
                product_id: product.id,
                images: form_data,
            });

            if (img_error)
                alert("Error: " + img_error);

            this.$root.showToast("Product successfully created", {
                type: "success",
                duration: 2000
            });

            this.images = [];
            this.$emit("save");
            await this.$refs.popup.close();
        },

        // Generate a blob preview of an image file
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

        // Remember the user image inputs and generate previews to display them
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

        // Delete the selected image
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
    <popup ref="popup" class="fast-product-popup">
        <h1>New Product</h1>
        <form class="new-product-form" @submit.prevent="createProduct">
            <label for="description">Description</label>
            <textarea rows="5" v-model="product.description"></textarea>
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
                name="type"
                :adding-function="Api.createSubtype"
                :listing-function="Api.listSubtypes"
                @change="subtype => product.subtype_id = subtype.id"
                is-searchable
            />
            <input :value="product.subtype_id" class="hidden-input" tabindex="-1" required>
            <label for="brand">Brand</label>
            <addable-dropdown
                name="brand"
                :adding-function="Api.createBrand"
                :listing-function="Api.listBrands"
                @change="brand => product.brand_id = brand.id"
                is-searchable
            />
            <input :value="product.brand_id" class="hidden-input" tabindex="-1" required>
            <label for="material">Material</label>
            <addable-dropdown
                name="type"
                :adding-function="Api.createMaterial"
                :listing-function="Api.listMaterials"
                is-searchable
                @change="material => product.material_ids = [material.id]"
            />
            <label for="size">Size</label>
            <textarea v-model="product.size" required/>
            <label>Images</label>
            <input type="file" accept="image/*" multiple required @change="e => addImages(e.target.files)">
            <div v-if="images.length" class="images-gallery">
                <div v-for="(image, i) in images" :key="i" class="gallery-image">
                    <img alt="Product image" :src="image.blob">
                    <span class="delete-icon" @click="deleteImage(i)">&times;</span>
                </div>
            </div>
            <button class="success">Create</button>
        </form>
    </popup>
</template>

<style>
.fast-product-popup {
    min-width: min(600px, 90%);
}
.fast-product-popup > h1 {
    font-size: 16pt;
    text-align: center;
    margin: 10px 0;
}

.fast-product-popup textarea {
    font-size: 14pt;
}
</style>
