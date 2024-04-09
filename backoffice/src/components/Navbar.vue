<script>

import Api from "../services/Api.js";
import DynamicListing from "../services/DynamicListing.js";
import ProductSubMenu from "./ProductSubMenu.vue";
import NavbarButton from "./NavbarButton.vue";
import SignUpPopUp from "./SignUpPopUp.vue";
import {useDisplay} from "vuetify";

export default {

    props: {
        isAuthorized: {
            type: Boolean,
            default: false
        },
    },

    data() {
        return {
            mobileBreakpoint: useDisplay(),
            routes: [],
            isMenuOpen: false,
            connectedShops: new DynamicListing(({prev_id, batch_size}) =>
                Api.listShops({prev_id, batch_size})
            ),
            dialog: false,
        };
    },

    emits: ["open-cart"],

    mounted() {
        if (this.isAuthorized) {
            void this.connectedShops.listBatch();
            this.setupRoutes();
        }
    },

    methods: {
        checkPermissions(permissions) {
            return !permissions || Api.user.permissions.has(...permissions);
        },

        /**
         * Sets up the routes for the component.
         * Filters top-level routes based on permissions
         * Constructs a list of valid routes with their non-404 children
         */
        setupRoutes() {
            this.routes.length = 0;

            this.$router.options.routes.forEach(route => {
                if (!route.meta?.is_top_level)
                    return;

                let has_permission = this.checkPermissions(
                    route.meta?.permissions
                );
                const children = route.children?.filter(child => {
                    const sub_route = this.$router.resolve({path: child.path});

                    return sub_route.name != "404"
                        && this.checkPermissions(sub_route.meta?.permissions);
                }) || [];

                if (has_permission || children.length) {
                    this.routes.push({
                        path: route.path,
                        name: route.name,
                        children
                    });
                }
            });
        },

        /**
         * Checks if the given route has a submenu.
         *
         * @param {string} route - The route to check.
         * @returns {boolean} - True if the route has a submenu, false otherwise.
         */
        hasSubmenu(routeName) {
            switch (routeName) {
            case "Products":
                return true;
            case "Connected Shops":
                return this.connectedShops.items.length === 0 ? false : true;
            case "Administration":
                return true;
            default:
                return false;
            }
        }
    },

    components: {
        ProductSubMenu,
        NavbarButton,
        SignUpPopUp,
    }
};
</script>

<template>
    <nav class="menu">
        <router-link class="logo" to="/selection" aria-label="Home"/>
        <div v-if="isAuthorized" class="routes" :class="{open: isMenuOpen}">
            <div class="main">
                <template v-for="route in routes">
                    <div class="route" v-if="route.path != '/sign-out'">
                        <router-link
                            :to="route.path"
                            custom
                            v-slot="{ href, isActive }"
                        >
                            <a :href="href" onclick="navigate" :class="{current: isActive}">
                                {{ route.name.toUpperCase() }}
                            </a>
                        </router-link>
                        <v-menu v-if="hasSubmenu(route.name)"
                            content-class="submenu"
                            activator="parent"
                            offset="20px"
                            open-on-hover
                        >
                            <v-list v-if="route.children?.length">
                                <div class="list-wrapper">
                                    <template
                                        v-for="child in route.children"
                                        :key="child.path"
                                    >
                                        <router-link
                                            :to="child.path"
                                            active-class="current">
                                                {{ child.name.toUpperCase() }}
                                        </router-link>
                                    </template>
                                </div>
                            </v-list>
                            <v-list v-else-if="route.path === '/products'">
                                <div class="submenu-products">
                                    <product-sub-menu
                                        title="brands"
                                        query-name="brand_ids"
                                    />
                                    <product-sub-menu
                                        title="iconics"
                                        query-name="keywords"
                                    />
                                    <product-sub-menu
                                        title="specials"
                                        query-name="specials"
                                    />
                                    <product-sub-menu
                                        title="categories"
                                        query-name="type_ids"
                                    />
                                </div>
                            </v-list>
                            <v-list v-else-if="route.path === '/shops'">
                                <div class="list-wrapper">
                                    <template v-for="shop in connectedShops.items"
                                        :key="shop.id">
                                        <router-link
                                            :to="`/shops/${shop.id}`"
                                            active-class="current"
                                        >
                                            {{ shop.name.toUpperCase() }}
                                        </router-link>
                                    </template>
                                </div>
                            </v-list>
                        </v-menu>
                    </div>
                </template>
            </div>
            <div class="route tools">
                <button class="nav-cart-button" @click="() => $root.openUserCart()"/>
                <router-link
                    custom
                    to="/sign-out"
                    v-slot="{href, navigate, isActive}"
                >
                    <a
                        @click.prevent="() => {
                            this.isMenuOpen = false;
                            navigate();
                        }"
                        :class="{current: isActive}"
                        :href="href"
                        >Sign out
                    </a>
                </router-link>
            </div>
        </div>
        <div v-else class="routes justify-end" :class="{open: isMenuOpen}">
            <div v-if="mobileBreakpoint.width <= 800" class="main">
                <div class="route">
                    <button class="border-none bg-transparent" @click="isMenuOpen = !isMenuOpen">
                        <router-link to="/sign-in">
                            Login
                        </router-link>
                    </button>
                    <v-dialog v-model="dialog" max-width="600">
                        <template v-slot:activator="{ props: activatorProps }">
                            <button v-bind="activatorProps" class="border-none bg-transparent">
                                <a>Sign Up</a>
                            </button>
                        </template>
                        <SignUpPopUp :dialog="dialog" @update-dialog="() => dialog = !dialog"/>
                    </v-dialog>
                </div>
            </div>
            <div v-else class="d-flex ga-2">
                <router-link to="/sign-in">
                    <button class="black">Login</button>
                </router-link>
                <v-dialog v-model="dialog" max-width="600">
                    <template v-slot:activator="{ props: activatorProps }">
                        <div class="d-flex ga-2" :class="{open: isMenuOpen}">
                            <button v-bind="activatorProps" class="black">Sign Up</button>
                        </div>
                    </template>
                    <SignUpPopUp :dialog="dialog" @update-dialog="() => dialog = !dialog"/>
                </v-dialog>
            </div>
        </div>
        <navbar-button :is-open="isMenuOpen" @click="() => { this.isMenuOpen = !this.isMenuOpen; }"/>
    </nav>
</template>

<style>

.v-overlay__content.submenu {
    box-shadow: none;
    font-size: 16px;
    border: 0px solid var(--white-grey);
    border-top-color: var(--light-grey-0);
    border-top-width: 1px;
    background: var(--white-grey);
}

.list-wrapper {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
}

.submenu .v-list > .submenu-products {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 80px;
    width: 97vw;
    height: 400px;
    margin: 0;
    overflow-x: none;
}

.menu {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    width: 100%;
    padding: 0 10px;
    min-height: fit-content;
    background: var(--white-grey);
    border: 0px solid var(--white-grey);
    border-bottom-color: var(--light-grey-0);
    border-bottom-width: 1px;
}

@keyframes logo-pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.08) rotate(-6deg); }
    100% { transform: scale(1); }
}

.menu {
    z-index: 10;
}
.menu > .logo {
    width: 60px;
    height: 60px;
    margin: 10px 10px 10px 0;
    padding: 0;
    border-radius: 100px;
    background: url("/img/logo.png") no-repeat center;
    background-size: contain;
    opacity: .8;
    transition: opacity .2s ease-in-out;
}
.menu > .logo:hover {
    animation: logo-pop .2s ease-in-out forwards;
    opacity: 1;
}

.menu .routes,
.menu .routes .main {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    row-gap: 10px;
    flex: 1;
    margin: 10px 0;
}
.menu .route {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-decoration: none;
    padding: 0 5px;
}
.menu .route a,
.list-wrapper a {
    height: auto;
    padding: 10px 25px;
    border-radius: 100px;
    color: var(--black-grey);
    opacity: .7;
    transition: background-color .2s ease-in-out,
    color .2s ease-in-out,
    opacity .2s ease-in-out;
}

.menu .route a {
    font-family: Avenue_Mono;
}

.list-wrapper a:hover {
    background-color: var(--white-color);
    color: var(--black-grey);
}

.menu .route a:not(.current):hover,
.menu .route a.current {
    border-bottom: 1px solid var(--black-grey);
    border-radius: 0px;
}
.menu .current {
    cursor: default;
}

.menu .submenu > a {
    margin: 0 5px;
}

.menu .route.tools {
    display: flex;
    flex-direction: row;
    gap: 0;
    margin-left: auto;
}

.menu .nav-cart-button {
    width: 30px;
    height: 30px;
    background: url("/icons/shopping-cart.svg") no-repeat center;
    background-size: contain;
    border: none;
    margin-right: 10px;
    opacity: .8;
}

.menu .nav-cart-button:hover {
    scale: 1.2;
    opacity: 1;
}

@media only screen and (max-width: 800px) {
    .menu > .logo {
        margin-right: auto;
    }

    .submenu .v-list {
        display: none;
    }

    .menu .routes {
        visibility: collapse;
        position: absolute;
        left: 0;
        top: 70px;
        width: 100%;
        flex-direction: column;
        align-items: flex-start;
        background-color: var(--white-grey);
        padding: 10px;
        transform: translateY(10px);
        opacity: 0;
        transition: all .2s ease-in-out;
    }

    .menu {
        height: 80px;
    }

    .menu .routes.open {
        visibility: visible;
        transform: none;
        opacity: 1;
        z-index: 10;
        display: flex;
        flex-direction: row;
        align-items: center;
        height: calc(100vh - 80px);
    }

    .menu .route {
        align-items: flex-start;
        width: 100%;
        height: auto;
    }

    .menu .route:last-of-type {
        margin-left: inherit;
    }
    .menu .route.tools {
        flex-direction: column;
        gap: 4px;
        margin-left: inherit;
    }
    .menu .route.tools > .nav-cart-button {
        margin-left: 20px;
    }
    .menu .route.tools a {
        font-weight: bold;
        padding-top: 10px;
    }
    .menu .nav-cart-button {
        width: 35px;
        height: 35px;
    }
    .routes .main {
        gap: 15px;
        display: flex;
        flex-direction: column;
    }
}
</style>
