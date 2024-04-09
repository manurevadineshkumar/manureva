<script>
import Popup from "./Popup.vue";
import ProductsList from "../ProductsList.vue";

export default {
    emits: ["pick-product"],

    props: {
        multiple: Boolean
    },

    data() {
        return {
        };
    },

    methods: {
        open() {
            this.$refs.popup.open();
        },

        close() {
            this.$refs.popup.close();
        },

        pickProduct(product) {
            this.close();
            this.$emit("pick-product", product);
        }
    },

    components: {
        ProductsList,
        Popup
    }
};
</script>
<template>
<popup ref="popup" class="product-picker-popup">
    <products-list columns="id name" @open-product="pickProduct"/>
</popup>
</template>

<style>
.product-picker-popup {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 80px);
}
</style>
