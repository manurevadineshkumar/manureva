<script>
import ProductsList from "../components/ProductsList.vue";
import ProductPopup from "../components/popups/ProductPopup.vue";

export default {
    data() {
        return {
            hash: this.$route.params.hash,
            products_count: 0,
        };
    },

    methods: {
        async listProducts(prev_id) {
            const {data} = await this.Api.listProductsInShareView({
                hash: this.hash,
                prev_id,
            });

            if (data.error)
                return this.$root.showToast(
                    "Couldn't load product, please try again later",
                    {type: "error"}
                );

            this.products_count = data.products_count;

            return {data};
        },
    },

    components: {
        ProductsList,
        ProductPopup,
    },
};
</script>

<template>
    <main class="page products-page shared">
        <product-popup ref="product-popup" />
        <section class="page-section">
            <label>
                <strong>
                    {{ products_count }}
                </strong>
                Product{{ products_count == 1 ? "" : "s" }}
            </label>
            <products-list
                ref="products-list"
                columns="id name colors materials prices"
                grid-view
                hide-filters
                :listing-function="({prev_id}) => this.listProducts(prev_id)"
                @open-product="(p) => $refs['product-popup'].openProduct(p)"
            />
        </section>
        </main>
</template>
