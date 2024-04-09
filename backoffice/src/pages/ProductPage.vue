<script>
import Api from "../services/Api";

import Product from "../components/Product.vue";

export default {
    data() {
        return {
            product: null,
        };
    },

    async mounted() {
        await this.fetchProduct();
    },

    methods: {
        /**
         * Fetches the product from the API and assigns it to the product data property.
         * If the product is not found, redirects to the products page.
         * @returns {Promise<void>}
         */
        async fetchProduct() {
            const {
                data: {
                    error,
                    product
                }
            } = await Api.getProductById(this.$route.params.id);

            if (error) {
                this.$router.push("/products");
            }

            this.product = product;
        }
    },

    components: {
        Product
    },
};
</script>

<template>
    <main class="page">
        <section class="product-page">
            <product
                ref="product"
                :product="product"
                @add-to-cart="() => $root.addCartItem(product)"
                @save="fetchProduct"
            />
        </section>
    </main>
</template>

<style>
.product-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--white-color);
    padding: 15px 20px;
    border-radius: 10px;
    flex: 1;
    overflow: scroll;
}
</style>
