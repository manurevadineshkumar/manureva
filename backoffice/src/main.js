import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";

import "./style.css";

import VueTelInput from "vue-tel-input";
import "vue-tel-input/vue-tel-input.css";

import App from "./App.vue";

import Api from "./services/Api.js";

import StringUtils from "./services/StringUtils.js";
import ArrayUtils from "./services/ArrayUtils.js";
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "@mdi/font/css/materialdesignicons.css";

/* import the fontawesome core */
import { library } from "@fortawesome/fontawesome-svg-core";

/* import font awesome icon component */
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

/* import specific icons */
import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import { faInstagram } from "@fortawesome/free-brands-svg-icons";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons";
import { faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { faEye } from "@fortawesome/free-solid-svg-icons";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
/* add icons to the library */
library.add(faCircleQuestion);
library.add(faCircleInfo);
library.add(faInstagram);
library.add(faLinkedin);
library.add(faEyeSlash);
library.add(faEye);
library.add(faCircleCheck);

const vuetify = createVuetify({
    theme: false,
    components,
    directives,
});

const routes = [
    {
        path: "/",
        name: "Welcome Page",
        component: () => import("@/pages/WelcomePage.vue"),
        meta: {
            public: true
        }
    },
    {
        path: "/sign-in",
        name: "Index",
        component: () => import("@/pages/IndexPage.vue"),
        meta: {
            public: true
        }
    },
    {
        path: "/sign-up",
        name: "Sign Up",
        component: () => import("@/pages/SignupPage.vue"),
        meta: {
            public: true
        }
    },
    {
        path: "/forgot-password",
        name: "ForgotPassword",
        component: () => import("@/pages/ForgotPasswordPage.vue"),
        meta: {
            public: true
        }
    },
    {
        path: "/password-rest",
        name: "passwordRest",
        component: () => import("@/pages/PasswordResetPage.vue"),
        meta: {
            public: true
        }
    },
    {
        path: "/selection",
        name: "Korvin Selection",
        component: () => import("@/pages/SelectionPage.vue"),
        meta: {
            permissions: ["PRODUCT_READ"]
        }
    },
    {
        path: "/products",
        name: "Products",
        component: () => import("@/pages/ProductsPage.vue"),
        meta: {
            is_top_level: true,
            permissions: ["PRODUCT_READ"]
        }
    },
    {
        path: "/tags",
        name: "Tags",
        component: () => import("@/pages/TagsPage.vue"),
        meta: {
            is_top_level: true,
            permissions: ["TAG_LIST"]
        }
    },
    {
        path: "/admin/orders",
        name: "Orders",
        component: () => import("@/pages/OrdersPage.vue"),
        meta: {
            permissions: ["ADMIN"]
        },
    },
    {
        path: "/orders/sales",
        name: "Sales",
        component: () => import("@/pages/SalesPage.vue"),
        meta: {
            is_top_level: true,
            permissions: ["ORDER_LIST_SALES"]
        }
    },
    {
        path: "/orders/purchases",
        name: "Purchases",
        component: () => import("@/pages/PurchasesPage.vue"),
        meta: {
            is_top_level: true,
            permissions: ["ORDER_LIST_PURCHASES"]
        }
    },
    {
        path: "/shops",
        name: "Connected Shops",
        component: () => import("@/pages/ShopsPage.vue"),
        meta: {
            is_top_level: true,
            permissions: ["SHOP_LIST"],
        },
    },
    {
        path: "/shops/create",
        name: "Create Shop",
        component: () => import("@/pages/ShopCreatePage.vue"),
        meta: {
            permissions: ["SHOP_LIST"],
        },
    },
    {
        path: "/shops/:id(\\d+)",
        name: "Shop",
        component: () => import("@/pages/ShopPage.vue")
    },
    {
        path: "/shops/:id(\\d+)/bindings",
        name: "Shop Bindings",
        component: () => import("@/pages/ShopBindingsPage.vue")
    },
    {
        path: "/marketplaces",
        name: "Marketplaces",
        component: () => import("@/pages/MarketplacesPage.vue"),
        meta: {
            is_top_level: true,
            permissions: ["MARKETPLACES_LIST"],
        }
    },
    {
        path: "/marketplaces/:id(\\d+)",
        name: "Marketplace",
        component: () => import("@/pages/MarketplacePage.vue")
    },
    {
        path: "/admin/",
        name: "Administration",
        component: () => import("@/pages/AdminPage.vue"),
        meta: {
            is_top_level: true,
            permissions: ["ADMIN"]
        },
        children: [
            {
                path: "/admin/scheduling",
                name: "Scheduling",
            },
            {
                path: "/admin/users",
                name: "Admin User Panel",
            },
            {
                path: "/admin/orders",
                name: "Admin Orders",
            }
        ]
    },
    {
        path: "/admin/scheduling",
        name: "Scheduling",
        component: () => import("@/pages/SchedulingPage.vue"),
        meta: {
            permissions: ["ADMIN"]
        }
    },
    {
        path: "/admin/users",
        name: "Admin User Panel",
        component: () => import("@/pages/AdminUsersPage.vue"),
        meta: {
            permissions: ["ADMIN"]
        }
    },
    {
        path: "/profile",
        name: "Profile",
        component: () => import("@/pages/ProfilePage.vue"),
        meta: {
            is_top_level: true
        }
    },
    {
        path: "/sign-out",
        name: "Sign Out",
        component: () => import("@/pages/SignOutPage.vue"),
        meta: {
            is_top_level: true
        }
    },
    {
        path: "/view/:hash(\\d+-[0-9a-f]{32})",
        name: "Shared View",
        component: () => import("@/pages/SharedViewPage.vue"),
        meta: { public: true }
    },
    {
        path: "/product/:id(\\d+)",
        name: "Product",
        component: () => import("@/pages/ProductPage.vue"),
        meta: {
            permissions: ["PRODUCT_READ"]
        }
    },
    {
        path: "/checkout/:hash",
        name: "Checkout",
        component: () => import("@/pages/CheckoutPage.vue"),
    },
    // Insert new routes before this line
    {
        path: "/forbidden",
        name: "Forbidden",
        component: () => import("@/pages/ForbiddenPage.vue"),
    },
    {
        path: "/:pathMatch(.*)*",
        name: "404",
        component: () => import("@/pages/NotFoundPage.vue")
    }
];

const router = createRouter({
    routes,
    history: createWebHistory()
});

const app = createApp(App);

app.use(router);

app.use(VueTelInput);

app.use(vuetify);

app.mixin({
    data() {
        return {
            Api,
            StringUtils,
            ArrayUtils,
            user: Api.user
        };
    }
});

router.isReady().then(() => app.component("font-awesome-icon", FontAwesomeIcon).mount("#app"));

router.beforeEach(async to => {
    await Api.loadUser();

    if (to.fullPath !== "/" && !to.meta?.public && !Api.user)
        return { name: "Index" };
});

router.afterEach(to => {
    document.title = to.fullPath == "/"
        ? "Korvin"
        : `Korvin | ${to.name}`;
});
