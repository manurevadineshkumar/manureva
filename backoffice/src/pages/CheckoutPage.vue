<script>
export default {
    data() {
        return {
            isLoading: true,
            error: null,
            productsCount: 0,
            failedProducts: [],
        };
    },

    async mounted() {
        const {data} = await this.Api.getCartPayment(
            this.$route.params.hash
        );

        this.isLoading = false;

        if (data.error) {
            this.error = data.error;
            return;
        }

        this.productsCount = +data.products_count;
        this.failedProducts = data.failed_products;
    }
};
</script>

<template>
    <section class="checkout-page">
        <div v-if="!isLoading && !error" class="confetti"/>
        <div v-if="isLoading" class="loading-text">
            Processing your request, sit tight...
        </div>
        <div v-else>
            <div class="checkout-result">
                <div v-if="!error" class="checkout-container">
                    <span class="emoji">🎉</span>
                    <h1 class="success-title">
                        Payment Successful!
                    </h1>
                    <p>
                        Thank you for your purchase!
                    </p>
                    <p>
                        Purchased {{ productsCount }}
                        item{{productsCount == 1 ? "" : "s"}}
                    </p>
                    <div v-if="failedProducts.length > 0" class="failed-products">
                        <p>
                            ⚠️ The following products could not be ordered:
                        </p>
                        <ul>
                            <li v-for="product in failedProducts" :key="product.id">
                                {{ product.name }} (#{{ product.id }})
                            </li>
                        </ul>
                        <p>
                            Please reach out to support with the names and IDs of failed items
                        </p>
                    </div>
                </div>
                <div v-else class="checkout-container">
                    <span class="emoji">🥺</span>
                    <h1 class="fail-title">
                        Payment failed
                    </h1>
                    <p>
                        Reason: {{error}}
                    </p>
                </div>
            </div>
        </div>
    </section>
</template>

<style>
.checkout-page {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
}

@keyframes blink-checkout-loading {
    0%, 100% { opacity: 1; }
    50% { opacity: .6; }
}
.checkout-page .loading-text {
    display: flex;
    justify-content: center;
    align-items: center;
    animation: blink-checkout-loading 2s ease infinite;
}

@keyframes confetti-appear {
    0% { opacity: 0; transform: scale(1.25); }
    100% { opacity: 1; transform: scale(1); }
}
.checkout-page .confetti {
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    background: url("/img/confetti.svg") repeat center;
    background-size: 600px;
    pointer-events: none;
    z-index: 1000;
    transform-origin: bottom;
    animation: confetti-appear 2s ease-out forwards;
}

.checkout-page .checkout-result {
    text-align: center;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, .1);
}
.checkout-page .checkout-container {
    background-color: var(--black-color);
    padding: 20px;
    border-radius: 10px;
    min-width: 300px;
    color: var(--light-grey-1);
}
.checkout-page .emoji {
    display: block;
    font-size: 48pt;
}
.checkout-page .failed-products {
    text-align: start;
    background: var(--light-brown);
    padding: 10px 20px;
    border-radius: 10px;
    color: var(--light-pink);
}

.checkout-page h1 {
    margin-bottom: 10px;
}
.checkout-page h1.success-title { color: var(--mustard-yellow); }
.checkout-page h1.fail-title { color: var(--regular-red); }

</style>
