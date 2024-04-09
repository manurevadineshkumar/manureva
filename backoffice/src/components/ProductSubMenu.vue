<script>

import Api from "../services/Api.js";

export default {
    props: {
        title: {
            type: String,
        },
        queryName: {
            type: String
        },
    },

    data() {
        return {
            brandId: [5, 6, 8, 11, 12, 13, 15],
            productList: {},
        };
    },

    async mounted() {
        this.productList = {
            brands: ((await Api.listBrands()).data.items).filter(({id}) => this.brandId.includes(id)),
            categories: [
                {name: "bags", id: 2}, {name: "clothes", id: [3, 4, 5, 8, 9]},
                {name: "accessories", id: [1, 10, 11]}, {name: "shoes", id: 7}
            ],
            iconics: [
                {brand: "", bag: "Timeless"},
                {brand: "Chanel -", bag: "2.55"},
                {brand: "Fendi -", bag: "Baguette"},
                {brand: "LV -", bag: "Speedy"},
                {brand: "Dior -", bag: "Saddle"},
                {brand: "Dior -", bag: "Lady"},
                {brand: "Gucci -", bag: "Jackie"},
            ],
            specials: [
                {filter: [{key: "keywords", value:"Vintage"}], name: "VINTAGE"},
                {filter: [{key: "keywords", value:"Monogram"}], name: "MONOGRAM"},
                {filter: [{key: "color_ids", value: 3}, {key: "type_ids", value:2}], name: "BLACK BAGS"},
                {filter: [{key: "subtype_ids", value: [17, 8]}], name: "SMALL BAGS"},
                {filter: [{key: "color_ids", value: [67, 58, 31, 50, 24, 60, 13, 37, 33, 53, 21, 54, 61]},
                    {key: "type_ids", value:2}], name: "ARTY"}
            ],
        };
    },

    methods: {
        generateRoute(element) {
            let query = {};
            if (this.title === "specials") {
                for (let item of element.filter) {
                    Object.assign(query, {[item.key]: item.value});
                }
                return {path: "/products", query};
            }
            if (element.bag === "Timeless") {
                query = {[this.queryName]: "Matelasse", bags_id: "2"};
            } else {
                query = {[this.queryName]: element.id ? element.id : element.bag};
            }
            return {path: "/products", query};
        },
    },
};
</script>

<template>
    <div>
      <h3>{{ title.toUpperCase() }}</h3>
        <div class="list-wrapper">
            <template v-for="element in productList[title]">
                <router-link :to="generateRoute(element)">
                    {{
                      element.name
                        ? element.name.toUpperCase()
                        : element.brand.toUpperCase() + " " + element.bag.toUpperCase()
                    }}
                </router-link>
            </template>
            <router-link :to="{ path: '/products' }">
                <p>{{ title === "brands" ? "See all products" : "" }}</p>
            </router-link>
        </div>
    </div>
</template>

<style>

.submenu-products h3 {
  padding: 10px 25px;
}
.list-wrapper p {
  text-decoration: underline;
  font-style: italic;
}
</style>
