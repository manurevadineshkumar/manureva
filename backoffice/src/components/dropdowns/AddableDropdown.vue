<script>
import DynamicDropdown from "./DynamicDropdown.vue";

import {nextTick} from "vue";

export default {
    emits: [
        "change"
    ],

    props: {
        name: String,
        addingFunction: Function,
        listingFunction: Function,
        deletableFunction: {
            type: Function,
            default: () => true
        },
        isMultiple: {
            type: Boolean,
            default: false
        },
        initialItems: {
            type: Array,
            default: []
        },
        isSearchable: {
            type: Boolean,
            default: false
        }
    },

    data() {
        return {
            newValue: "",
            isCreating: false,
            items: new Map()
        };
    },

    mounted() {
        this.items = new Map(this.initialItems.map(item => [+item.id, item]));
    },

    methods: {
        async addValue() {
            const {data} = await this.addingFunction({name: this.newValue});

            if (data.error)
                return alert("Error: " + data.error);

            this.newValue = "";
            this.isCreating = false;

            await this.$refs.dropdown.reload();

            this.onPick(data);
        },

        onPick(item, cancel_cb) {
            this.$refs.dropdown.reset();

            if (!this.isMultiple)
                return this.$emit("change", item, cancel_cb);

            this.items.set(+item.id, item);

            this.$emit("change", [...this.items.values()], cancel_cb);
        },

        onDelete(item) {
            this.items.delete(+item.id);

            this.$emit("change", [...this.items.values()]);
        },

        async switchIsCreating() {
            this.isCreating = !this.isCreating;

            await nextTick();

            this.$refs["new-input"].focus();
        }
    },

    components: {
        DynamicDropdown
    }
};
</script>

<template>
<div class="item-tag">
    <span v-for="item in items.values()" :key="item.id">
        <button class="button-tag" type="button" @click="item && deletableFunction(item) && onDelete(item)">
            {{ item.name }}
            <template v-if="item && deletableFunction(item)">
                &times;
            </template>
        </button>
    </span>
</div>
<div class="addable-dropdown-row">
    <input
        ref="new-input"
        v-show="isCreating"
        type="text"
        v-model="newValue"
        :placeholder="`New ${name} name...`"
        v-on:keydown.enter.prevent="addValue"
    >
    <button v-if="isCreating" type="button" class="inline-input-button" @click="addValue">Add</button>
    <dynamic-dropdown
        ref="dropdown"
        v-show="!isCreating"
        :no-preview="isMultiple"
        :listing-function="listingFunction"
        @change="([value], cancel_cb) => onPick(value, cancel_cb)"
        :is-searchable="isSearchable"
    >
        {{ isMultiple ? "Add" : "Pick" }} a {{ name }}
    </dynamic-dropdown>
    <button
        type="button"
        class="add-button"
        :class="{rotated: isCreating}"
        @click="switchIsCreating"
    >+</button>
</div>
</template>

<style>
.item-tag {
    display: flex;
    flex-wrap: wrap;
    margin: 2px 2px 8px;
    gap: 4px;
}
.item-tag span button {
    margin: 0;
    flex-wrap: wrap;
}

.addable-dropdown-row {
    position: relative;
    display: flex;
    align-items: center;
    flex-direction: row;
    gap: 10px;
    margin-bottom: 2px;
}
.addable-dropdown-row > input, .addable-dropdown-row > .dropdown {
    height: 40px;
    flex: 1;
}
.addable-dropdown-row > input::placeholder {
    color: var(--light-grey-2);
}
.addable-dropdown-row > .add-button {
    border-radius: 50px;
    font-size: 14pt;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 35px;
    height: 35px;
    margin: 0 !important;
    padding: 0 0 2px 0;
    transform: rotate(0);
    transition: all .2s ease-in-out;
    font-family: Inconsolata;
}
.addable-dropdown-row > .add-button.rotated {
    transform: rotate(135deg);
    padding: 0 0 3px 0;
}
.addable-dropdown-row > .inline-input-button {
    --offset: 40px;
    margin-top: 0;
}
</style>
