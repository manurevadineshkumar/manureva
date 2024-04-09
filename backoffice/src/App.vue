<script>
import Api from "./services/Api.js";

import Navbar from "./components/Navbar.vue";
import ToastView from "./components/ToastView.vue";
import Cart from "./components/Cart.vue";
import AppFooter from "./components/ui/Footer.vue";

export default {
    data() {
        return {
            isAuthorized: !!Api.user,
            routes: []
        };
    },

    methods: {
        authorize() {
            this.$root.user = Api.user;
            this.isAuthorized = true;
            this.$refs["navbar"].setupRoutes();
        },

        showToast(message, options) {
            this.$refs["toast-view"].showToast(message, options);
        },

        openUserCart(user) {
            this.$refs.cart.open(user?.id || null);
        },

        addCartItem(item) {
            this.$refs.cart.addItem(item);
        },

        signOut() {
            this.isAuthorized = false;
        },

        blurActiveElement() {
            document.activeElement?.blur();
        }
    },

    components: {
        Navbar,
        ToastView,
        Cart,
        AppFooter
    }
};
</script>

<template>
    <v-app>
        <toast-view ref="toast-view"/>
        <div>
            <navbar ref="navbar" :is-authorized="isAuthorized"/>
            <router-view/>
            <app-footer/>
        </div>
        <cart ref="cart" v-if="isAuthorized"/>
    </v-app>
</template>
