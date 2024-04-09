<script>
import ProductsList from "../components/ProductsList.vue";
import DynamicDropdown from "../components/dropdowns/DynamicDropdown.vue";
import ProductPopup from "../components/popups/ProductPopup.vue";
import BulkActionPopup from "../components/popups/BulkActionPopup.vue";

export default {
    emits: ["add-item-to-cart"],

    data() {
        return {
            showCartButton: false,
            selectedProducts: []
        };
    },

    components: {
        BulkActionPopup,
        DynamicDropdown,
        ProductPopup,
        ProductsList
    },
};
</script>

<template>
    <product-popup
        ref="product-popup"
        @reload="$refs['products-list'].reloadProducts();"
        @switch-product="delta => $refs['products-list'].openOtherProduct(delta)"
    />
    <main class="page products-page">
        <section class="page-section">
            <products-list
                ref="products-list"
                class="products-list"
                columns="id name brand colors materials prices"
                bulk-actions="add-tag remove-tag add-to-exporting-shop remove-from-exporting-shop add-to-marketplace"
                @open-product="(p) => $refs['product-popup'].openProduct(p)"
            />
        </section>
    </main>
</template>

<style>
.products-page {
    position: relative;
    overflow-x: hidden;
    overflow-y: auto;
}
.products-page .page-section {
    padding: 0px;
    gap: 10px;
}

.products-page .cart-toggle {
    position: absolute;
    overflow: hidden;
    background: none;
    border: none;
    border-radius: 100px 0 0 100px;
    cursor: pointer;
    margin-right: -15px;
    padding: 10px;
    right: -80px;
    top: 230px;
    transition: right 0.3s ease-in-out;
    background: var(--grey);
}

.products-page .cart-toggle.show-button {
    right: 0;
}

.products-page .cart-toggle:hover {
    background: var(--grey);
}

.products-page .arrow-icon {
    background-image: url("/icons/shopping-cart.svg");
    background-size: 75%;
    background-position: center;
    background-repeat: no-repeat;
    display: block;
    border: none;
    width: 60px;
    height: 60px;
    opacity: 0.6;
    transition: right 0.3s ease-in-out;
}

@media only screen and (max-width: 600px) {
    .products-page {
        overflow: auto;
    }

    .products-page .cart-toggle {
        display: none;
    }
}
</style>
