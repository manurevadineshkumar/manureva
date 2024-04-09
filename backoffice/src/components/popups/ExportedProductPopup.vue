<script>
import Popup from "./Popup.vue";
import ProductsList from "../ProductsList.vue";

export default {
    emits: [
        "save"
    ],

    data() {
        return {
            product: null,
        };
    },

    methods: {
        open(product) {
            this.product = JSON.parse(JSON.stringify(product));
            this.$refs.popup.open();
        },

        close() {
            this.$refs.popup.close();
        },

        save() {
            this.$emit("save", {
                id: this.product.id,
                exported_name: this.product.exported_name || null,
                exported_description: this.product.exported_description || null,
            });
        }
    },

    components: {
        ProductsList,
        Popup
    }
};
</script>
<template>
    <popup ref="popup" class="exported-product-popup">
        <h1>
            Exported product
        </h1>
        <section v-if="product" class="product-fields">
            <label>
                Name
            </label>
            <input
                v-model="product.exported_name"
                :placeholder="product.name"
                maxlength="1024"
            >
            <label>
                Description
            </label>
            <textarea
                v-model="product.exported_description"
                :placeholder="product.description"
                maxlength="1024"
            />
        </section>
        <section class="controls">
            <button @click="close">
                Cancel
            </button>
            <button class="success" @click="save">
                Save
            </button>
        </section>
    </popup>
</template>

<style>
.exported-product-popup {
    min-width: min(95vw, 500px);
}
.exported-product-popup .product-fields {
    display: flex;
    flex-direction: column;
}
.exported-product-popup .product-fields label {
    margin: 10px 0 5px 0;
}
.exported-product-popup .controls {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
}

.exported-product-popup textarea {
    min-height: 200px;
}
</style>
