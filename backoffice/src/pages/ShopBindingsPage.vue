<script>
import Api from "../services/Api.js";

import Dropdown from "../components/dropdowns/Dropdown.vue";
import PageSection from "../components/ui/PageSection.vue";

export default {
    data() {
        return {
            shopId: this.$route.params.id,
            category: null,
            attributes: null,
            attributesIndex: null,
            entities: null,
            entitiesIndex: null,
            bindings: null,
            newBinding: {},
            isTurned: false
        };
    },

    async mounted() {
        const {status, data} = await Api.listShopAttributes(this.shopId);

        if (status != 200)
            return this.returnToShop(true);

        this.attributes = Object.values(data)
            .map(({id: attribute_id, name: attribute_name, values}) =>
                values.map(({id, value, name}) => ({
                    id,
                    attribute_id,
                    name: this.formatAttributeName(attribute_name)
                        + `: ${name ?? value}`,
                    attribute_name
                }))
            )
            .flat();
        this.attributesIndex = this.buildIndex(this.attributes);
    },

    methods: {
        capitalize(str) {
            return str[0].toLocaleUpperCase() + str.substring(1);
        },

        formatAttributeName(name) {
            const [type, meta] = name.split(":");

            if (meta)
                return `${meta} (${this.capitalize(type)})`;

            return this.capitalize(type);
        },

        buildIndex(arr, key = "id") {
            return Object.fromEntries(arr.map(it => [it[key], it]));
        },

        returnToShop(is_aborted = false) {
            if (is_aborted)
                this.$router.replace("/shops");
            else
                this.$router.push("/shops/" + this.shopId);
        },

        async selectCategory(category) {
            this.isTurned = true;
            this.bindings = [];
            this.entities = [];
            this.entitiesIndex = null;
            this.newBinding = {};

            const {
                data: {error, bindings, entities}
            } = await Api.getShopBindings(this.shopId, category);

            if (error)
                return alert("Error: " + error);

            this.category = category;
            this.bindings = bindings;
            this.entities = entities;
            this.entitiesIndex = this.buildIndex(entities);
        },

        async pickBinding(binding, cancel_cb) {
            Object.assign(this.newBinding, binding);

            if (
                this.newBinding.korvin_id === undefined
                || this.newBinding.shop_id === undefined
            )
                return;

            const {data: {error}} = await Api.setShopBinding(
                this.shopId, this.category,
                this.newBinding.korvin_id, this.newBinding.shop_id
            );

            if (error) {
                cancel_cb();
                return alert("Error: " + error);
            }

            if (this.bindings.every(({korvin_id, shop_id}) =>
                this.newBinding.korvin_id != korvin_id
                || this.newBinding.shop_id != shop_id
            )) {
                this.bindings.push(this.newBinding);

                this.bindings.sort((a, b) => {
                    if (a.korvin_id < b.korvin_id)
                        return -1;
                    if (a.korvin_id > b.korvin_id)
                        return 1;
                    if (a.shop_id < b.shop_id)
                        return -1;
                    if (a.shop_id > b.shop_id)
                        return 1;
                    return 0;
                });
            }

            this.newBinding = {};

            this.$refs["new-binding-korvin-dropdown"].reset();
            this.$refs["new-binding-shop-dropdown"].reset();
        },

        async deleteBinding(binding) {
            const {data: {error}} = await Api.deleteShopBinding(
                this.shopId, this.category,
                binding.korvin_id, binding.shop_id
            );

            if (error)
                return alert("Error: " + error);

            this.bindings = this.bindings.filter(b =>
                b.korvin_id != binding.korvin_id
                || b.shop_id != binding.shop_id
            );
        }
    },

    components: {
        Dropdown,
        PageSection
    }
};
</script>

<template>
<main class="page store-bindings-page">
    <div class="turning-card" :class="{turned: isTurned}">
        <PageSection class="turning-card-side">
            <header v-if="attributes" class="section-header">
                <h1>Bindings</h1>
                <button class="black" @click="() => returnToShop()">Back</button>
            </header>
            <h2>Pick a category:</h2>
            <section class="categories">
                <div class="category" @click="selectCategory('genders')">
                    <h1>Genders</h1>
                </div>
                <div class="category" @click="selectCategory('types')">
                    <h1>Types</h1>
                </div>
                <div class="category" @click="selectCategory('brands')">
                    <h1>Brands</h1>
                </div>
                <div class="category" @click="selectCategory('colors')">
                    <h1>Colors</h1>
                </div>
                <div class="category" @click="selectCategory('materials')">
                    <h1>Materials</h1>
                </div>
            </section>
        </PageSection>
        <section v-if="category" class="page-section turning-card-side">
            <header class="section-header">
                <h1>
                    {{ capitalize(category) }} bindings
                </h1>
                <button class="black" @click="isTurned = false">Back</button>
            </header>
            <div class="listing-header">
                <div class="row header">
                    <div class="col">Korvin {{ category.slice(0, -1) }}</div>
                    <div class="col">Shop {{ category.slice(0, -1) }}</div>
                    <div class="col actions-col"/>
                </div>
            </div>
            <div class="new-binding-form">
                <dropdown
                    ref="new-binding-korvin-dropdown"
                    is-searchable
                    :items="entities"
                    @change="([item], cancel_cb) => pickBinding({korvin_id: item.id}, cancel_cb)"
                >
                    Select {{category.slice(0, -1)}}...
                </dropdown>
                <dropdown
                    ref="new-binding-shop-dropdown"
                    is-searchable
                    :items="attributes.map(attr =>
                        attr.id == newBinding.shop_id
                            ? {...attr, selected: 1}
                            : attr
                    )"
                    @change="([item], cancel_cb) => pickBinding({shop_id: item.id}, cancel_cb)"
                >
                    Select attribute...
                </dropdown>
            </div>
            <transition-group
                v-if="entities && attributes && bindings"
                tag="div"
                name="binding-row"
                class="listing-items"
            >
                <div
                    v-for="binding in bindings"
                    :key="binding.korvin_id + ':' + binding.shop_id"
                    class="row binding-row"
                >
                    <div class="col">{{ this.entitiesIndex[binding.korvin_id]?.name }}</div>
                    <div class="col">{{ this.attributesIndex[binding.shop_id]?.name }}</div>
                    <div class="col actions-col">
                        <button class="mini-button action-delete" @click="() => deleteBinding(binding)"/>
                    </div>
                </div>
            </transition-group>
        </section>
    </div>
</main>
</template>

<style>
.store-bindings-page {
    perspective: 6000px;
    min-height: 500px;
}

.store-bindings-page .section-header {
    margin: 30px;
}
.store-bindings-page h2 {
    text-align: center;
    opacity: .75;
}
.store-bindings-page .col.dropdown-col {
    overflow: unset;
}
.store-bindings-page .dropdown {
    width: 100%;
}
.store-bindings-page .categories {
    flex: 1;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 20px;
    overflow: auto;
    padding: 10px 0;
}
.store-bindings-page .category {
    flex: 1;
    background-size: 90%;
    background-repeat: no-repeat;
    background-position: bottom -50px right -50px;
    padding: 10px;
    border-radius: 10px;
    cursor: pointer;
    min-width: 200px;
    max-width: 200px;
    height: 200px;
    transition: all .2s ease-in-out;
    border: 1px solid var(--white-grey);
}

.store-bindings-page .category:nth-child(1) {
    --color: #f6f2;
    background-image: url("/img/categories/genders.svg");
}
.store-bindings-page .category:nth-child(2) {
    --color: #ff92;
    background-image: url("/img/categories/types.svg");
}
.store-bindings-page .category:nth-child(3) {
    --color: #8af2;
    background-image: url("/img/categories/brands.svg");
}
.store-bindings-page .category:nth-child(4) {
    --color: #fa72;
    background-image: url("/img/categories/colors.svg");
}
.store-bindings-page .category:nth-child(5) {
    --color: #4de2;
    background-image: url("/img/categories/materials.svg");
}
.store-bindings-page .category:hover {
    background-color: var(--color);
    background-position: bottom -30px right -30px;
    box-shadow: -10px -10px 0 0 var(--see-through-black-0);
    transform: translate(5px, 5px);
}

.store-bindings-page .category > h1 {
    margin: 10px 0 0 0;
    text-align: center;
}
.store-bindings-page .new-binding-form {
    padding-top: 10px;
    display: flex;
    gap: 20px;
}

.binding-row {
    max-height: 50px;
    overflow: hidden;
}
.binding-row-enter-active, .binding-row-leave-active {
    transition: max-height .2s ease-in-out, padding .2s ease-in-out;
}
.row.binding-row-enter-from, .row.binding-row-leave-to {
    padding: 0 10px;
    max-height: 0;
}

@media only screen and (max-width: 600px) {
    .store-bindings-page .section-header > h1 {
        font-size: 1.3rem;
    }
}
</style>
