<script>
import Api from "../services/Api.js";

import DynamicListing from "../services/DynamicListing.js";

import ProductPopup from "../components/popups/ProductPopup.vue";
import OrderPopup from "../components/popups/OrderPopup.vue";
import Tooltip from "../components/Tooltip.vue";

export default {
    props: {
        listing: {
            type: DynamicListing,
            required: true,
        },
        isBuyer: {
            type: Boolean,
            default: false,
        }
    },

    methods: {
        async openProduct(order) {
            const {data: {product}} = await Api.getProductById(
                order.product_id
            );
            this.$refs["product-popup"].openProduct(product);
        },

        async openOrder(order) {
            await this.$refs["order-popup"].openOrder(order);
        },

        async reloadOrders() {
            await this.listing.listBatch({reset: true});
        },

        getDateColor(order) {
            if (!this.user.permissions.has("ADMIN"))
                return "";

            const placement_date = new Date(order.placement_date);
            const current_date = new Date();

            const time_diff = current_date - placement_date;
            const diff_days = Math.round(time_diff / (1000 * 60 * 60 * 24));

            if (order.status != "PENDING")
                return "green";
            if (diff_days < 5)
                return "yellow";
            else if (diff_days == 5)
                return "orange";
            return "red";
        },

        getDateColorForReceived(order) {
            if (!this.user.permissions.has("ADMIN"))
                return "";

            const current_date = new Date();
            const received_date = new Date(order.korvin_reception_date);

            const time_diff = current_date - received_date;
            const diff_days = Math.ceil(time_diff / (1000 * 60 * 60 * 24));
            const status_colors = {
                COMPLETED: "green",
                DELIVERED: diff_days < 15 ? "yellow" : diff_days === 15 ? "orange" : "green",
                RECEIVED: "yellow",
                CANCELED: "red",
                WAITING_FOR_PAYMENT: "beige",
            };

            return status_colors[order.status];
        },
    },

    computed: {
        orders() {
            return this.listing.items;
        },
        fields() {
            return Object.fromEntries(
                Object.keys(this.listing?.items?.[0] || {})
                    .map(key => ([key, true]))
            );
        }
    },

    components: {
        ProductPopup,
        OrderPopup,
        Tooltip,
    },
};
</script>

<template>
<main class="page orders-page">
    <product-popup ref="product-popup" />
    <order-popup
        ref="order-popup"
        @reload="reloadOrders"
    />
    <section class="page-section">
        <div v-if="orders?.length" class="listing-header">
            <div class="row header">
                <div v-if="fields?.id" class="col">Order ID</div>
                <div v-if="fields?.product_id" class="col">Product ID</div>
                <div v-if="fields?.price" class="col">Price</div>
                <div v-if="fields?.user" class="col">User</div>
                <div v-if="fields?.placement_date" class="col">{{ isBuyer ? "Sold on" : "Placement Date"}} </div>
                <div v-if="fields?.korvin_reception_date" class="col">Received at</div>
                <div v-if="fields?.status" class="col">Status</div>
            </div>
        </div>
        <div class="listing-items orders-list" @scroll="listing.handleScroll">
            <div v-if="!listing.isLoading && !orders?.length" class="empty-doodle"></div>
            <div v-for="order in orders" :key="order.id" class="row">
                <div v-if="fields?.id" class="col orders-page-button">
                    <button
                        type="button"
                        @click="openOrder(order)"
                        v-if="user.permissions.has('READ_ORDER_DETAILS') && isBuyer || user.permissions.has('ADMIN')"
                    >
                        #{{ ("" + order.id).padStart(8, "0") }}
                    </button>
                    <p v-else>#{{ ("" + order.id).padStart(8, "0") }}</p>
                </div>
                <div v-if="fields?.product_id" class="col orders-page-button">
                    <button @click="openProduct(order)" v-if="user.permissions.has('PRODUCT_READ')">
                        #{{ order.product_id }}
                    </button>
                    <p v-else>#{{ order.product_id }}</p>
                </div>
                <div v-if="fields?.bought_price" class="col">
                    {{ isBuyer ? Math.round(order.boughtPrice / 100) : order.price_eur }} €
                </div>
                <div v-if="fields?.user" class="col">{{ order.user.username }}</div>
                <div v-if="fields?.placement_date" class="col date-tooltip" :class="getDateColor(order)">
                    <p>
                        {{ new Date(order.placement_date).toLocaleString("en-GB") }}
                    </p>
                    <Tooltip :text="'Yellow = In Progress\nOrange = To watch very closely\nRed = Urgent'" />
                </div>
                <div
                    v-if="fields?.korvin_reception_date"
                    class="col date-tooltip"
                    :class="getDateColorForReceived(order)"
                >
                    <p>
                        {{ order.korvin_reception_date
                            ? new Date(order.korvin_reception_date).toLocaleString("en-GB")
                            : "Not received yet"
                        }}
                    </p>
                    <Tooltip
                    v-if="order.korvin_reception_date"
                    :text="'Yellow = In Progress\nOrange = To watch very closely\nBeige = Payment \nRed = Refunded'" />
                </div>
                <div v-if="fields?.status" class="col">
                    <p>{{ order?.status }}</p>
                </div>
            </div>
        </div>
    </section>
</main>
</template>

<style>

.listing-items.orders-list {
    max-height: 740px;
    overflow-y: scroll;
}
.orders-page-button button {
    border: none;
    padding: 10px;
    width: 100px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.orders-page .listing-items > .row > .col.date-tooltip {
    overflow: visible;
    padding: 10px;
}

.col.green > p {
    color: var(--black-color);
    border-radius: 25px;
    background-color: var(--regular-green);
    padding: 5px 8px;
}

.col.yellow > p {
    color: var(--black-color);
    border-radius: 25px;
    background-color: var(--mustard-yellow);
    padding: 5px 8px;
}

.col.orange > p {
    color: var(--black-color);
    border-radius: 25px;
    background-color: var(--regular-orange);
    padding: 5px 8px;
}

.col.beige > p {
    color: var(--black-color);
    border-radius: 25px;
    background-color: var(--beige);
    padding: 5px 8px;
}

.col.red > p {
    color: var(--black-color);
    border-radius: 25px;
    background-color: var(--regular-red);
    padding: 5px 8px;
}

.col.grey > p {
    color: var(--black-color);
    border-radius: 25px;
    background-color: var(--light-grey-1);
    padding: 5px 8px;
}
.date-tooltip {
    position: relative;
}

.orders-page .tooltip {
    transform: translate(-10%, 35%);
    white-space: pre-line;
}

@media only screen and (max-width: 600px) {
    .orders-page .listing-header > .row {
        overflow: auto;
        justify-content: flex-start;
    }

    .orders-page .listing-items > .row > .col,
    .orders-page .listing-header > .row > .col {
        min-width: 100px;
    }

    .orders-page .listing-items > .row  {
        justify-content: flex-start;
        flex-wrap: nowrap;
    }

    .orders-page .listing-items > .row > .col.orders-page-button {
        overflow: scroll;
    }
}
</style>
