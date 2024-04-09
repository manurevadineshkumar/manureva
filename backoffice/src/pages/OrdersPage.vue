<script>
import Api from "../services/Api.js";
import OrdersList from "../components/OrdersList.vue";
import DynamicListing from "../services/DynamicListing";

export default {
    mounted() {
        void this.orderList.listBatch();
        if (!Api.user.permissions.has("ADMIN"))
            this.$root.showToast("User doesn't have access, you will be redirected", {
                type: "error",
                duration: 2000,
                redirect: "forbidden",
            });
    },

    data() {
        return {
            orderList: new DynamicListing(({prev_id, batch_size}) =>
                Api.listOrders({user_type: "buyer", prev_id, batch_size})
            )
        };
    },

    components: {
        OrdersList,
    },
};
</script>

<template>
    <OrdersList :listing="orderList"/>
</template>
