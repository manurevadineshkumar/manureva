<script>
import Popup from "./Popup.vue";
import Product from "../Product.vue";

export default {
    emits: ["add-to-cart", "reload", "close", "save", "switch-product"],

    data() {
        return {
            product: null,
            touchStartX: 0,
            imgMode: 0
        };
    },

    methods: {
        /**
         * Open the product popup.
         * @param {Object} product - The product to open.
         */
        async openProduct(product) {
            if (!product) {
                await this.$refs.popup.close();
                this.product = null;
                return;
            }

            this.product = product;
            await this.$refs.popup.open();
        },

        /**
         * Reset the product to null.
         * Close the product popup.
         */
        closeProduct() {
            this.product = null;
            this.$refs.popup.close();
            this.$emit("close");
            this.$emit("save");
        },

        /**
         * Handle the touch start event.
         * @param {Object} e - The touch event.
         */
        handleTouchStart(e) {
            this.touchStartX = e.touches[0].clientX;
        },

        /**
         * Handle the touch end event.
         * @param {Object} e - The touch event.
         */
        handleTouchEnd(e) {
            const delta_x = this.touchStartX - e.changedTouches[0].clientX;

            if (Math.abs(delta_x) > 100)
                this.$emit("switch-product", delta_x > 0 ? 1 : -1);
        }
    },

    components: {
        Popup,
        Product
    },
};
</script>

<template>
    <popup ref="popup" class="product-popup" @touchstart="handleTouchStart" @touchend="handleTouchEnd">
        <product
            ref="product"
            :product="product"
            @save="() => $emit('reload')"
            @order="closeProduct"
            @add-to-cart="() => $root.addCartItem(product)"
        />
    </popup>
</template>

<style>
.product-popup {
    max-width: 80vw;
    background: var(--white-color);
}

.button-icon {
    background-image: url("/icons/add-shopping-cart.svg");
    background-size: contain;
    width: 20px;
    height: 20px;
    animation: cart-icon-pop 1s infinite;
}

@keyframes cart-icon-pop {
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

.product-popup .img-ai-panel {
    display: flex;
    justify-content: center;
    margin-bottom: 10px;
}

.product-popup .ai-panel-button-container {
    display: flex;
    gap: 25px;
}

.product-popup .ai-panel-button-container > button:hover {
    background-color: transparent;
}

.product-popup .ai-panel-button-container > button {
    border: none;
    opacity: .4;
}

.product-popup .ai-panel-button-container > button:disabled {
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

.product-popup .product-description {
    gap: 20px;
}

@media only screen and (max-width: 600px) {
    .product-popup .product-actions {
        flex-direction: column;
        align-items: center;
    }
    .product-popup .product-actions a,
    .product-popup .product-actions button {
        width: 100%;
    }
}

</style>
