<script>
import Popup from "./popups/Popup.vue";
import Api from "../services/Api.js";
import DynamicListing from "../services/DynamicListing.js";
import Dropdown from "@/components/dropdowns/Dropdown.vue";
import DynamicDropdown from "@/components/dropdowns/DynamicDropdown.vue";
import TooltipText from "./ui/TooltipText.vue";

export default {
    data() {
        return {
            id: null,
            productsGroup: {},
            couponValue: "",
            step: 0,
            totals: {},
            userId: null,
            certificateIds: new Set(),
            coupons: [],
            listing: new DynamicListing(({prev_id, batch_size}) =>
                Api.listCartProducts({
                    user_id: this.userId,
                    prev_id,
                    batch_size
                })
            ),
            shippingType: null,
            shippingAddress: {},
            CERTIFICATE_COST: 1000,
            SHIPPING_TYPES: [
                {
                    id: "DAP",
                    name: "DAP (shipping, no taxes)",
                    description: "shipping included, pay VAT + import taxes upon receipt"
                },
                {
                    id: "EXW",
                    name: "EXW (no shipping)",
                    description: "shipping not included, send a shipping label to Korvin to complete your order"
                }
            ],
            STEP_PREDICATES: [
                () => !!this.products.length,
                null,
                () => [
                    this.shippingType,
                    this.shippingAddress.country_id,
                    this.shippingAddress.city,
                    this.shippingAddress.zip,
                    this.shippingAddress.street
                ].every(Boolean),
                null,
            ]
        };
    },

    computed: {
        products() {
            return this.listing.items;
        },

        canAdvanceStep() {
            return this.STEP_PREDICATES[this.step]
                && !this.STEP_PREDICATES[this.step]();
        }
    },

    methods: {
        async open(user_id = null) {
            this.userId = user_id || Api.user.id;
            this.step = 0;
            this.totals = {};
            this.certificateIds = new Set();
            this.couponValue = "";
            this.coupons = [];
            this.shippingType = null;
            this.shippingAddress = {
                country_id: this.$root.user.addressCountryId,
                city: this.$root.user.addressCity,
                zip: this.$root.user.addressZip,
                street: this.$root.user.addressStreet,
            };

            await this.$refs.popup.open();

            this.$refs["cart-step-contents"].scrollTo({left: 0});

            void this.updateCart();
            void this.listing.listBatch({reset: true});
        },

        async updateCart() {
            const {
                status, data: {products_group}
            } = await Api.getUserCart(this.userId);

            if (status !== 200)
                return this.$root.showToast(
                    "Failed to update cart",
                    {type: "error"}
                );

            this.productsGroup = products_group;
        },

        async removeItem(i) {
            const {status} = await Api.removeProductFromCart(
                this.products[i].id
            );

            if (status !== 200)
                return this.$root.showToast("Can't remove item from cart", {
                    type: "error",
                    duration: 1000,
                });

            this.products.splice(i, 1);

            void this.updateCart();
        },

        async addItem(item) {
            const {data: {error}} = await Api.addProductToCart(item.id);

            if (error)
                return this.$root.showToast(`Error: ${error}`, {type: "error"});

            this.$root.showToast(`Added ${item.name} to cart`, {
                type: "success",
                duration: 1000,
            });

            void this.listing.listBatch({reset: true});
        },

        async copyCsvUrl() {
            const url = `${Api.BASE_URL}/carts/${this.id}/csv?token=`
                + encodeURIComponent(this.productsGroup.share_token);

            await navigator.clipboard.writeText(url);

            this.$root.showToast(`Cart URL copied to clipboard`, {
                type: "info",
                duration: 2000,
            });
        },

        async copyShareViewUrl() {
            const url = Api.getShareViewUrl(this.productsGroup);

            await navigator.clipboard.writeText(url);

            this.$root.showToast("Share View URL copied to clipboard", {
                type: "info",
                duration: 2000,
            });
        },

        formatPrice(price) {
            return price === null ? "-" : (price / 100).toFixed(2) + "€";
        },

        formatDiscountedPrice(product, priceType) {
            const discountedPrice = priceType + "_discounted";
            const price = product[discountedPrice] ? product[discountedPrice] : product[priceType];
            return  this.formatPrice(price);
        },

        async changeStep(delta) {
            this.step += delta;

            this.$refs["cart-step-contents"].scrollTo({
                left: 580 * this.step,
                behavior: "smooth"
            });

            if (this.step == 4) {
                this.totals = (await Api.getCartTotals({
                    certificate_ids: this.certificateIds,
                    shipping_type: this.shippingType,
                    country_id: this.shippingAddress.country_id,
                    coupon_codes: new Set()
                })).data;
                this.totals.global = Object.values(this.totals)
                    .reduce((acc, v) => acc + v, 0);
            }
        },

        toggleCertificate(id, value) {
            if (value)
                this.certificateIds.add(id);
            else
                this.certificateIds.delete(id);
        },

        addCoupon() {
            return;

            const value = this.couponValue.trim().toLocaleUpperCase();

            this.coupons.push({
                value,
                comment: "-10% on your damn bill"
            });
            this.couponValue = "";
        },

        removeCoupon(i) {
            this.coupons.splice(i, 1);
        },

        async checkout() {
            this.$root.showToast("Please wait...");

            const {data: {error, url}} = await Api.createCartPayment({
                certificate_ids: [...this.certificateIds],
                shipping_type: this.shippingType,
                country_id: this.shippingAddress.country_id,
                coupon_codes: this.coupons
            });

            if (error)
                return this.$root.showToast(
                    `Error: ${error}, please try again or contact support`,
                    {type: "error"}
                );

            window.open(url, "_blank");
        },
    },

    components: {
        DynamicDropdown,
        Dropdown,
        Popup,
        TooltipText
    }
};
</script>

<template>
    <popup ref="popup" class="cart">
        <div class="cart-buttons">
            <button class="cart-close-button" @click="$refs.popup.close">&times;</button>
            <button class="mini-button action-share-view" @click="copyShareViewUrl">
                <TooltipText
                    text="Share selection link"
                    location="bottom"
                />
            </button>
            <button class="mini-button action-csv" @click="copyCsvUrl">
                <TooltipText
                    text="Export to csv"
                    location="bottom"
                />
            </button>
        </div>
        <h2 class="cart-header">
            Cart
        </h2>
        <div class="cart-steps">
            <template v-for="(_, i) in Array.from({length: 5})">
                <div class="cart-step" :class="{active: i <= step}">
                    <div v-if="i" class="step-progress"/>
                    <span>{{ i + 1 }}</span>
                </div>
            </template>
        </div>
        <div ref="cart-step-contents" class="cart-step-contents">
            <div class="cart-step-content">
                <h3>Manage items</h3>
                <transition-group name="cart-item" tag="div" class="cart-items">
                    <div v-for="(item, i) in products" :key="item.id" class="cart-item">
                        <button @click="removeItem(i)" class="mini-button action-delete" :disabled="step !== 0"/>
                        <div
                            class="item-image"
                            :style="{background: `center / contain no-repeat url(${item.image_urls[0]})`}"
                        ></div>
                        <div class="item-details-left">
                            <p class="item-name">{{ item.name }}</p>
                            <p class="item-brand" v-if="item.brand?.name">{{ item.brand.name }}</p>
                        </div>
                        <div class="item-details-right">
                            <div class="item-price">
                                {{ formatDiscountedPrice(item, "wholesale_price_cents") }}
                            </div>
                        </div>
                    </div>
                </transition-group>
                <div class="cart-total">
                    <p class="cart-price">
                        {{productsGroup.products_count}}
                        product{{productsGroup.products_count == 1 ? "" : "s"}}
                    </p>
                </div>
            </div>
            <div class="cart-step-content">
                <h3>Add authenticity certificates</h3>
                <div class="cart-items">
                    <div v-for="item in products" :key="item.id" class="cart-item">
                        <input
                            type="checkbox"
                            :disabled="step !== 1"
                            @change="e => toggleCertificate(item.id, e.target.checked)"
                        >
                        <div
                            class="item-image"
                            :style="{background: `center / contain no-repeat url(${item.image_urls[0]})`}"
                        ></div>
                        <div class="item-details-left">
                            <p class="item-name">{{ item.name }}</p>
                            <p class="item-brand" v-if="item.brand?.name">{{ item.brand.name }}</p>
                        </div>
                        <div v-if="certificateIds.has(item.id)" class="item-details-right">
                            <div class="item-price">
                                +{{ formatPrice(CERTIFICATE_COST) }}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="cart-total">
                    <p class="cart-price">
                        {{ certificateIds.size }} certificate{{ "s".repeat(certificateIds.size != 1) }}
                        ({{ formatPrice(certificateIds.size * CERTIFICATE_COST) }})
                    </p>
                </div>
            </div>
            <div class="cart-step-content">
                <h3>Choose shipping</h3>
                <h4>
                    Incoterms
                </h4>
                <dropdown v-model:value="shippingType" :items="SHIPPING_TYPES" class="shipping-dropdown">
                    Pick a shipping type
                </dropdown>
                <p v-if="shippingType" class="shipping-description">
                    {{ shippingType }}: {{
                        SHIPPING_TYPES.find(({id}) => id == shippingType).description
                    }}
                </p>
                <h4>
                    Address
                </h4>
                <div class="address-row">
                    <div class="address-input">
                        <label>Country</label>
                        <dynamic-dropdown
                            is-searchable
                            v-model:value="shippingAddress.country_id"
                            :listing-function="Api.listCountries"
                        >Choose country...</dynamic-dropdown>
                    </div>
                </div>
                <div class="address-row">
                    <div class="address-input">
                        <label>City</label>
                        <input
                            v-model="shippingAddress.city"
                            autocomplete="shipping address-level2"
                            placeholder="London"
                            :disabled="step !== 2"
                        >
                    </div>
                    <div class="address-input small">
                        <label>Postal code</label>
                        <input
                            v-model="shippingAddress.zip"
                            autocomplete="shipping postal-code"
                            placeholder="NW1"
                            :disabled="step !== 2"
                        >
                    </div>
                </div>
                <div class="address-row">
                    <div class="address-input">
                        <label>Street</label>
                        <input
                            v-model="shippingAddress.street"
                            autocomplete="shipping address-level3"
                            placeholder="221b Baker Street"
                            :disabled="step !== 2"
                        >
                    </div>
                </div>
            </div>
            <div class="cart-step-content coupons-content">
                <h3>Add coupons</h3>
                <div>
                    <label class="coupon-comment" for="coupon-input">
                        Enter a coupon number:
                    </label>
                    <input
                        id="coupon-input"
                        placeholder="ABC"
                        maxlength="16"
                        v-model="couponValue"
                        @keydown.enter.prevent="addCoupon"
                        :disabled="step !== 3"
                    />
                </div>
                <p
                    :style="{visibility: coupons.length ? 'visible' : 'hidden'}"
                    class="coupon-comment"
                >
                    Active coupons:
                </p>
                <transition-group name="coupon" tag="div" class="coupons">
                    <div v-for="(coupon, i) in coupons" :key="coupon.value" class="cart-item coupon">
                        <button
                            :disabled="step !== 3"
                            class="mini-button action-delete"
                            @click="() => removeCoupon(i)"
                        />
                        <div class="item-details-left">
                            <p class="item-name">{{ coupon.value }}</p>
                            <p class="item-brand">{{ coupon.comment }}</p>
                        </div>
                    </div>
                </transition-group>
            </div>
            <div class="cart-step-content">
                <h3>Recap</h3>
                <div class="cart-items">
                    <div v-for="product in products" :key="product.id" class="cart-item">
                        <div
                            class="item-image"
                            :style="{background: `center / contain no-repeat url(${product.image_urls[0]})`}"
                        ></div>
                        <div class="item-details-left">
                            <p class="item-name">
                                {{ product.name }}
                                <span
                                    v-if="certificateIds.has(product.id)"
                                    class="certificate-tag"
                                >with certificate</span>
                            </p>
                            <p class="item-brand" v-if="product.brand?.name">{{ product.brand.name }}</p>
                        </div>
                        <div class="item-details-right">
                            <div class="item-price">
                                {{ formatDiscountedPrice(product, "wholesale_price_cents") }}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="cart-total">
                    <p class="cart-price-row">
                        Products<span/>{{ formatPrice(totals.products) }}
                    </p>
                    <p class="cart-price-row">
                        Authenticity certificates<span/>{{ formatPrice(totals.certificates) }}
                    </p>
                    <p class="cart-price-row">
                        Shipping<span/>{{ formatPrice(totals.shipping) }}
                    </p>
                    <p class="cart-price-row" v-if="totals.vat">
                        VAT<span/>{{ formatPrice(totals.vat) }}
                    </p>
                    <p class="cart-price-row">
                        Coupons<span/>{{ formatPrice(totals.discount || -.001) }}
                    </p>
                    <p class="cart-price-row total">
                        Total<span/>{{ formatPrice(totals.global) }}
                    </p>
                </div>
            </div>
        </div>
        <div v-if="userId == user.id" class="cart-control-buttons">
            <button class="black" v-if="step" @click="() => changeStep(-1)">Back</button>
            <button v-if="step == 4" class="checkout-button" @click="checkout">Checkout</button>
            <button v-else :disabled="canAdvanceStep" class="black" @click="() => changeStep(1)">Next</button>
        </div>
    </popup>
</template>

<style>
.cart {
    display: flex;
    flex-direction: column;
    background: linear-gradient(to bottom, var(--white-color) 0%, var(--off-white) 100%);
    border: none;
    border-radius: 10px 0 0 10px;
    padding: 10px;
    width: 600px;
    height: 100%;
    position: fixed;
    right: 0;
    margin: 0;
    transform: none;
}

.cart h2, .cart h3 {
    margin: 0 0 15px 0;
    text-align: center;
}
.cart h4 {
    margin: 0 0 10px 0;
}
.cart .cart-buttons {
    display: flex;
    width: 100%;
    gap: 10px;
}
.cart .cart-close-button {
    display: inline-block;
    padding: 0 10px;
    margin: -5px auto 0 -5px;
    border: 0;
    border-radius: 5px;
    font-weight: normal;
    font-size: 24pt;
    background: none;
    color: var(--mid-grey);
}
.cart .cart-close-button:hover {
    color: var(--light-grey-2);
}
.cart button.mini-button {
    margin: 0;
}

.cart .cart-steps {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
}
.cart .cart-step {
    cursor: default;
    display: flex;
    align-items: center;
}
.cart .cart-step > span {
    min-width: 30px;
    min-height: 30px;
    text-align: center;
    padding: 1px 0 0 0;
    background: radial-gradient(var(--black-grey) 15px, #0000 15px)
        var(--light-grey-1)
        top left -30px
        no-repeat;
    color: var(--light-grey-2);
    font-size: 16pt;
    border-radius: 100px;
    z-index: 1;
    transition: color .2s ease-in-out, background-position .2s ease-in-out;
}
.cart .step-progress {
    height: 3px;
    width: 40px;
    background: var(--light-grey-1);
    border-radius: 2px;
    margin: 0 -4px;
}
.cart .step-progress::before {
    position: absolute;
    content: "";
    background: var(--black-grey);
    height: 4px;
    width: 0;
    border-radius: 2px;
    transition: width ease-in-out .2s;
    transition-delay: .2s;
}
.cart .cart-step.active > span {
    background-position: left;
    color: var(--white-color);
    transition-delay: .2s;
}
.cart .cart-step.active .step-progress::before {
    width: 40px;
    transition-delay: 0s;
}

.cart .cart-step-contents {
    position: relative;
    display: flex;
    flex-direction: row;
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
}
.cart .cart-step-content {
    display: flex;
    flex-direction: column;
    min-width: 580px;
    height: 100%;
}
.cart .cart-items {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

.cart .cart-item {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 10px;
    margin-bottom: 10px;
    transition: all .2s ease-in-out;
}
.cart .cart-item:not(:last-child) {
    border-bottom: 1px solid var(--mid-grey);
    padding-bottom: 10px;
}

.cart .cart-item-leave-to {
    margin-top: -60px;
    opacity: 0;
    transform: translate(0, 60px);
}

.cart .item-image {
    width: 40px;
    height: 40px;
    background-color: var(--black-grey);
    background-size: cover;
    border-radius: 5px;
}

.cart .item-details-left {
    flex: 1;
}
.cart .item-details-left > p {
    min-height: 20px;
    margin: 0;
}
.cart .item-brand {
    font-size: 10pt;
    opacity: .7;
}

.cart .item-details-right {
    margin-right: 5px;
    font-size: 12pt;
    font-weight: bold;
}

.cart .shipping-dropdown {
    margin-bottom: 10px;
}
.cart .shipping-description {
    font-size: 10pt;
    margin: 0 0 10px 0;
    font-style: italic;
    opacity: .5;
}
.cart .address-row {
    display: flex;
    gap: 10px;
}
.cart .address-input {
    flex: 3;
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 10px;
}
.cart .address-input.small {
    flex: 1;
}

.cart .coupons-content {
    display: flex;
    flex-direction: column;
}
.cart .coupons-content input {
    width: 100%;
    text-transform: uppercase;
}
.cart .coupon-comment {
    display: block;
    margin: 10px 0;
    font-size: 14pt;
}
.cart .coupons {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 10px;
}
.cart .coupon {
    transition: all .2s ease-in-out;
}
.cart .coupon-enter-active,
.cart .coupon-leave-active {
    transition: all .2s ease-in-out;
}

.cart .coupon-enter-from,
.cart .coupon-leave-to {
    margin-top: -60px;
    opacity: 0;
    transform: translate(50%, 60px);
}

.cart .certificate-tag {
    display: inline-block;
    padding: 0 10px;
    font-size: 10pt;
    color: var(--bright-orange);
    background-color: var(--bright-yellow);
    border-radius: 10px;
}

.cart-total {
    padding: 10px 20px;
    text-align: right;
    color: var(--mid-grey);
    border-top: 1px solid var(--mid-grey);
}
.cart-total > p {
    margin: 0;
}
.cart-total .cart-price {
    font-size: 16pt;
    font-weight: bold;
    margin-bottom: 5px;
}

.cart .cart-control-buttons {
    display: flex;
}
.cart .cart-control-buttons > button:last-child{
    margin-left: auto;
}
.cart .checkout-button {
    --color: var(--bright-orange);
}

.cart .cart-price-row {
    display: flex;
    opacity: .75;
}
.cart .cart-price-row.total {
    opacity: 1;
    font-weight: bold;
    margin-top: 10px;
}
.cart .cart-price-row > span {
    flex: 1;
    margin: 15px 2px 5px 3px;
    height: 0;
    border-bottom: 2px dotted #aaa;
}

@media only screen and (max-width: 600px) {
    .cart {
        width: 100%;
        height: 100%;
    }
}

</style>
