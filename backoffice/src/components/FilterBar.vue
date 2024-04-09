<script>
import Api from "../services/Api";
import Dropdown from "./dropdowns/Dropdown.vue";
import DynamicDropdown from "./dropdowns/DynamicDropdown.vue";

export default {
    emits: [
        "change",
    ],

    props: {
        filterValues: {
            type: Object,
        }
    },

    data() {
        return {
            searchTimeout: null,
            reduceFilters: true,
            gridView: true,
            typeList: [],
            subTypeList: [],
            allCountries: [],
        };
    },

    async created() {
        this.typeList = await this.formatTypeList(Api.listTypes);
        this.subTypeList = await this.formatTypeList(Api.listSubtypes);
        this.allCountries = await Api.listCountries();
    },

    computed: {
        vendorCountries() {
            if (!this.allCountries.data) return [];

            return this.allCountries.data.items.filter(
                (country) => country.name === "France" || country.name === "Japan");
        }
    },

    methods: {
        /**
         * Handles filter updates
         * @param changes {Object} an object of updated filter values
         * @param cancel_cb {Function} a callback to call to revert changes
         */
        onChange(changes = {}, cancel_cb) {
            if (changes.status !== undefined && this.filterValues.id)
                return cancel_cb();
            Object.assign(this.filterValues, changes);
            this.$emit("change", this.filterValues);
        },

        /**
         * Toggles the filter bar visibility
         */
        reduce() {
            this.reduceFilters = !this.reduceFilters;
        },

        show() {
            this.reduceFilters = false;
        },
        /**
         * Capitalize type and sub-type first letter and replace all "-" by spaces
         */
        async formatTypeList(fct) {
            const apiList = (await fct()).data.items;
            for (let item of apiList) {
                item.name = item.name[0].toUpperCase() + item.name.slice(1).replaceAll("-", " ");
            }
            return apiList;
        },

        userHasPermission(permission) {
            return Api.user?.permissions.has(permission);
        }
    },

    components: {
        Dropdown,
        DynamicDropdown,
    }
};
</script>

<template>
    <form class="filter-form" :class="{'visible': !reduceFilters}" v-if="filterValues">
        <div class="simple-fields">
            <div>
                <label>ID:</label>
                <input
                    v-model="filterValues.id"
                    type="number"
                    placeholder="Enter ID..."
                    autocomplete="off"
                    min="1"
                    @input="onChange"
                >
            </div>
            <div class="search-field">
                <label>Title:</label>
                <input
                    v-model="filterValues.keywords"
                    placeholder="Enter keywords..."
                    @input="onChange"
                >
            </div>
            <div v-if="userHasPermission('ADMIN')">
                <label>Status:</label>
                <dropdown
                    v-model:value="filterValues.status"
                    @change="([{id}], cancel_cb) => onChange({status: id}, cancel_cb)"
                    :items="[
                        {id: null, name: 'Any'},
                        {id: 'DISABLED', name: 'Disabled'},
                        {id: 'ACTIVE', name: 'Active'},
                        {id: 'PENDING', name: 'Pending'},
                        {id: 'SOLD', name: 'Sold'},
                        {id: 'LOCKED', name: 'Locked'}
                    ]"
                >Any</dropdown>
            </div>
        </div>
        <div class="simple-fields">
            <div>
                <label>Brand:</label>
                <dynamic-dropdown
                    is-multiple
                    :listing-function="Api.listBrands"
                    @change="brands => onChange({brand_ids: brands.map(({id}) => id)})"
                    is-searchable
                >Any</dynamic-dropdown>
            </div>
            <div>
                <label>Colors:</label>
                <dynamic-dropdown
                    is-multiple
                    :listing-function="Api.listColors"
                    @change="colors => onChange({color_ids: colors.map(({id}) => id)})"
                    is-searchable
                >Any</dynamic-dropdown>
            </div>
            <div>
                <label>Materials:</label>
                <dynamic-dropdown
                    is-multiple
                    :listing-function="Api.listMaterials"
                    @change="materials => onChange({material_ids: materials.map(({id}) => id)})"
                    is-searchable
                >Any</dynamic-dropdown>
            </div>
            <div>
                <label>Tags:</label>
                <dynamic-dropdown
                    is-multiple
                    :listing-function="Api.listTags"
                    @change="tags => onChange({tag_ids: tags.map(({id}) => id)})"
                >Any</dynamic-dropdown>
            </div>
            <div>
                <label>Type:</label>
                <dropdown
                    is-multiple
                    :items="typeList"
                    @change="types => onChange({type_ids: types.map(({id}) => id)})"
                    is-searchable
                >Any</dropdown>
            </div>
            <div>
                <label>Subtype:</label>
                <dropdown
                    is-multiple
                    :items="subTypeList"
                    @change="subtypes => onChange({subtype_ids: subtypes.map(({id}) => id)})"
                    is-searchable
                >Any</dropdown>
            </div>
            <div>
                <label>Grade:</label>
                <dropdown
                    :items="[
                        {id: null, name: 'Any'},
                        {id: 'S', name: 'S'},
                        {id: 'SA', name: 'SA'},
                        {id: 'A', name: 'A'},
                        {id: 'AB', name: 'AB'},
                        {id: 'B', name: 'B'},
                        {id: 'BC', name: 'BC'},
                        {id: 'C', name: 'C'},
                    ]"
                    is-searchable
                    @change="([{id}]) => onChange({grade: id})"
                >Any</dropdown>
            </div>
            <div>
                <label>Country:</label>
                <dropdown
                    is-multiple
                    :items="this.vendorCountries"
                    @change="country_ids => onChange({country_ids})"
                    is-searchable
                >Any</dropdown>
            </div>
            <div>
                <label>Price:</label>
                <div class="range-container">
                    <div class="range-input">
                        <input
                        v-model="filterValues.wholesalePriceFrom"
                        type="number"
                        min="0"
                        placeholder="From"
                        @input="onChange"> €
                    </div>
                    <div class="range-input">
                        <input
                            v-model="filterValues.wholesalePriceTo"
                            type="number"
                            min="0"
                            placeholder="To"
                            @input="onChange"> €
                    </div>
                </div>
            </div>
            <div class="date-field range-container">
                <div>
                    <label>
                        Created from:
                    </label>
                    <input v-model="filterValues.createdFrom" type="date" @input="onChange">
                </div>
                <div>
                    <label>
                        to:
                    </label>
                    <input v-model="filterValues.createdTo" type="date" @input="onChange">
                </div>
            </div>
        </div>
        <div class="simple-fields check-fields">
            <div>
                <label>Has serial</label>
                <input v-model="filterValues.hasSerial" type="checkbox" @change="onChange">
            </div>
            <div>
                <label>Has guarantee card</label>
                <input v-model="filterValues.hasGuaranteeCard" type="checkbox" @change="onChange">
            </div>
            <div>
                <label>Has dust bag</label>
                <input v-model="filterValues.hasDustBag" type="checkbox" @change="onChange">
            </div>
            <div>
                <label>Has box</label>
                <input v-model="filterValues.hasBox" type="checkbox" @change="onChange">
            </div>
        </div>
    </form>
  </template>

<style>

.filter-form {
    transition: all 0.25s ease-in-out;
    max-height: 0;
    overflow: visible;
    padding: 10px;
}
.filter-form.visible {
    visibility: visible;
    max-height: 600px;
    overflow-y: scroll;
}

.filter-form .price-fields,
.filter-form .simple-fields {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
    width: 100%;
    margin: 15px 0;
}
.filter-form .simple-fields input {
    box-sizing: border-box;
}
.filter-form .price-fields input[type="number"] {
    appearance: none;
    -webkit-appearance: none;
    width: 120px;
}

.filter-form .price-fields > div,
.filter-form .simple-fields > div {
    display: flex;
    flex-direction: row;
    align-items: center;
}
.filter-form .check-fields > div {
    gap: 10px;
}

.filter-form .price-fields > div.date-field {
    margin-left: auto;
}

.filter-form .simple-fields > div.search-field {
    flex: 1;
}
.filter-form .simple-fields > div.search-field > input {
    width: 100%;
}

.range-input {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding-top: 5px;
    gap: 5px;
}

.range-container {
    display: flex;
    gap: 5px;
}

@media only screen and (max-width: 600px) {
    .filter-form {
        overflow-y: scroll;
        overflow-x: hidden;
    }

    .filter-form .price-fields > div,
    .filter-form .simple-fields > div {
        display: flex;
        justify-content: space-between;
        width: 100%;
    }

    .filter-form .simple-fields input:not[type="checkbox"] {
        width: 100%;
    }

    .date-field {
        flex-wrap: wrap;
    }
    .date-field > div {
        display: flex;
        justify-content: space-between;
        width: 100%;
    }

    .range-container {
        flex-direction: column;
    }
}
</style>
