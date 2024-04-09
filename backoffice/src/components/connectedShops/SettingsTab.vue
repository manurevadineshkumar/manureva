<script>
export default {
    props: {
        shop: {
            type: Object,
            required: true
        },
        shopPlatform: {
            type: Object,
            required: true
        },
        loading: {
            type: Boolean,
            required: true
        }
    },

    emits: ["launchSetup", "openShopPopUp", "deleteShop"],
};
</script>

<template>
    <div v-if="shop">
        <v-container align="center" class="shop-settings">
            <v-col align="center">
                <v-row style="height: 100px;">
                    <v-card class="settings-button">
                        <button
                            class="w-100 h-100 success"
                            :disabled="loading"
                            @click="$emit('launchSetup')"
                        >
                            Launch Setup
                        </button>
                    </v-card>
                </v-row>
                <v-row style="height: 100px;">
                    <v-card class="settings-button">
                        <a v-if="this.shopPlatform && !this.shopPlatform.is_public"
                            :href="`/shops/${this.shop.id}/bindings`">
                            <button class="w-100 h-100" :disabled="loading">
                                Set up bindings
                            </button>
                        </a>
                    </v-card>
                </v-row>
                <v-row style="height: 100px;">
                    <v-card class="settings-button">
                        <button class="primary w-100 h-100" :disabled="loading" @click="$emit('openShopPopUp')">
                            Edit Shop
                        </button>
                    </v-card>
                </v-row>
                <v-row style="height: 100px;">
                    <v-card class="settings-button">
                        <button class="danger w-100 h-100" :disabled="loading" @click="$emit('deleteShop')">
                            Delete Shop
                        </button>
                    </v-card>
                </v-row>
            </v-col>
        </v-container>
    </div>
</template>
<style>
    .shop-page .shop-settings {
        margin-top: 40px;
    }

    .shop-page .shop-settings .settings-button {
        margin: 10px 10px;
        width: 450px;
        height: 50px;
    }

    .v-card--variant-elevated {
        box-shadow: none;
    }

    @media only screen and (max-width: 800px) {
        .shop-page .shop-settings {
            margin-top: 0px;
        }

        .shop-page .shop-settings .settings-button {
            width: 230px;
        }

        .shop-page .shop-settings .settings-button button {
            font-size: 12px;
        }
    }
</style>
