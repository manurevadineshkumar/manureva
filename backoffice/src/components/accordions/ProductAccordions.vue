<script>
import Accordion from "./Accordion.vue";

import AddableDropdown from "../dropdowns/AddableDropdown.vue";

export default {
    props: {
        product: {
            type: Object,
            required: true
        },
        productChanges: {
            type: Object,
            required: true
        },
        isEditing: {
            type: Boolean,
            required: true
        }
    },

    components: {
        Accordion,
        AddableDropdown,
    },
};
</script>

<template>
    <accordion>
        <template #title>
            Details
        </template>
        <template #content>
            <table>
                <tbody>
                    <tr>
                        <th v-if="product?.model || isEditing" >Model</th>
                        <td v-if="isEditing">
                            <input type="text" v-model="productChanges.model" />
                        </td>
                        <td v-else-if="product?.model">
                            {{ product.model }}
                        </td>
                    </tr>
                    <tr v-if="product?.type" :class="{'mobile-field': isEditing}">
                        <th>Type</th>
                        <td v-if="isEditing">
                            <addable-dropdown
                                name="type"
                                :adding-function="Api.createType"
                                :listing-function="Api.listTypes"
                                @change="type => productChanges.type_id = type.id"
                                is-searchable
                            />
                        </td>
                        <td v-else>{{ product.type?.name }}</td>
                    </tr>
                    <tr v-if="product?.subtype" :class="{'mobile-field': isEditing}">
                        <th>Subtype</th>
                        <td v-if="isEditing">
                        <addable-dropdown
                            name="subtype"
                            :adding-function="Api.createSubtype"
                            :listing-function="Api.listSubtypes"
                            @change="subtype => productChanges.subtype_id = subtype.id"
                            is-searchable
                        />
                        </td>
                        <td v-else>{{ product.subtype?.name }}</td>
                    </tr>
                    <tr v-if="product?.materials" :class="{'mobile-field': isEditing}">
                        <th>Materials</th>
                    <td v-if="isEditing" class="row-tag">
                        <addable-dropdown
                            is-multiple
                            name="material"
                            :adding-function="Api.createMaterial"
                            :listing-function="Api.listMaterials"
                            :initial-items="[...productChanges.materials.values()]"
                            @change="(materials) => (productChanges.materials = materials)"
                        />
                    </td>
                    <td v-else>
                        <span
                            v-for="material in product.materials"
                            class="product-tag"
                            v-text="material.name"
                        />
                    </td>
                    </tr>
                    <tr v-if="product?.colors">
                        <th>Colors</th>
                        <td v-if="isEditing" class="row-tag">
                            <addable-dropdown
                                is-multiple
                                name="color"
                                :adding-function="Api.createColor"
                                :listing-function="Api.listColors"
                                :initial-items="[...productChanges.colors.values()]"
                                @change="(colors) => (productChanges.colors = colors)"
                            />
                        </td>
                        <td v-else>
                            <span class="product-tag" v-text="color.name" v-for="color in product.colors"/>
                        </td>
                    </tr>
                    <tr :class="{'mobile-field': isEditing}">
                        <th>Size</th>
                        <td v-if="isEditing">
                            <textarea v-model="productChanges.size" />
                        </td>
                        <td v-else>
                            <ul class="product-size-list">
                                <li v-for="[key, value] in Object.entries(product.size || {})">
                                    {{key}}: {{value}}
                                </li>
                            </ul>
                        </td>
                    </tr>
                    <tr :class="{'mobile-field': isEditing}">
                        <th>Description</th>
                        <td v-if="isEditing">
                            <textarea v-model="productChanges.description" />
                        </td>
                        <td v-else>
                            {{ product.description }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </template>
    </accordion>
    <accordion v-if="!isEditing">
        <template #title>
            Extra
        </template>
        <template #content>
            <ul class="product-extras">
                <li :class="{active: product.has_serial}">
                    {{ product.has_serial ? "Has" : "No" }}
                    serial
                </li>
                <li :class="{active: product.has_guarantee_card}">
                    {{ product.has_guarantee_card ? "Has" : "No" }}
                    guarantee card
                </li>
                <li :class="{active: product.has_box}">
                    {{ product.has_box ? "Has" : "No" }}
                    box
                </li>
                <li :class="{active: product.has_storage_bag}">
                    {{ product.has_storage_bag ? "Has" : "No" }}
                    storage bag
                </li>
            </ul>
        </template>
    </accordion>
    <accordion v-if="Api.user?.permissions?.has('ADMIN') && !isEditing">
        <template #title>
            Other
        </template>
        <template #content>
            <table>
                <tbody>
                    <tr v-if="product?.creation_date">
                        <th>Created</th>
                        <td>
                            {{ new Date(product.creation_date).toLocaleString("en-GB") }}
                        </td>
                    </tr>
                    <tr v-if="product?.last_scrape">
                        <th>Last scrape</th>
                        <td>
                            {{ new Date(product.last_scrape).toLocaleString("en-GB") }}
                        </td>
                    </tr>
                    <tr v-if="product?.last_update">
                        <th>Last update</th>
                        <td>
                            {{ new Date(product.last_update).toLocaleString("en-GB") }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </template>
    </accordion>
</template>

<style>
.product-size-list {
    list-style: none;
    padding: 0;
    line-height: 1.8;
}
.product-extras {
    list-style: none;
    padding: 0;
}
.product-extras > li {
    margin: 10px 0;
    padding: 0 0 0 20px;
    background: url("/icons/close-gray.svg") no-repeat center left;
    background-size: 15px;
    opacity: .5;
}
.product-extras > li.active {
    background-image: url("/icons/checkbox-gray.svg");
    opacity: 1;
}
</style>
