<script>
import {useElementBounding} from "@vueuse/core";

let hasEventHandlers = null;
let openDropdown = null;

export default {
    emits: [
        "update:value",
        "update:values",
        "open",
        "close",
        "change",
        "scroll-finished"
    ],
    props: {
        value: [String, Number],
        values: Array,
        items: Array,
        itemKey: {
            type: String,
            default: "id"
        },
        itemName: {
            type: String,
            default: "name"
        },
        itemValue: {
            type: String,
            default: "name"
        },
        maxMultiple: {
            type: Number,
            default: 2
        },
        isMultiple: Boolean,
        isSearchable: Boolean,
        noPreview: Boolean,
        disabled: Boolean,
    },

    data() {
        return {
            isOpen: false,
            width: 0,
            selected: this.isMultiple
                ? new Set(this.values)
                : (this.value ? new Set([this.value]) : new Set()),
            targetIdx: -1,
            foundKeys: new Set,
            bottomBound: null,
            isTop: false,
            searchQuery: ""
        };
    },

    computed: {
        foundItems() {
            return this.isSearchable
                ? this.items.filter(item =>
                    item[this.itemName]
                        ?.toLocaleLowerCase()
                        ?.includes(this.searchQuery)
                )
                : this.items;
        }
    },

    mounted() {
        const bounding = useElementBounding(this.$el);

        this.bottomBound = bounding.bottom;
        this.width = bounding.width;

        if (hasEventHandlers)
            return;

        hasEventHandlers = true;

        document.body.addEventListener("click", e => {
            if (openDropdown && !openDropdown.$el.contains(e.target))
                openDropdown.toggle(false);
        });
    },

    methods: {
        getItemByKey(key) {
            return this.items.find(it => it[this.itemKey] == key) || null;
        },

        toggle(is_open = null) {
            this.isOpen = is_open === null ? !this.isOpen : is_open;

            if (this.isOpen) {
                openDropdown?.toggle(false);
                this.search("");
            }

            if (this.isSearchable)
                this.$nextTick(() => this.$refs["search-bar"]?.select());

            openDropdown = this.isOpen ? this : null;

            this.$emit(this.isOpen ? "open" : "close");
        },

        selectItem(item) {
            const key = item[this.itemKey];
            const prev_selected = new Set(this.selected);
            const cancel_cb = () => {
                this.selected = prev_selected;
            };

            this.$nextTick(() => {
                this.width = this.$refs.dropdown.clientWidth;
            });

            if (this.isMultiple) {
                if (this.selected.has(key))
                    this.selected.delete(key);
                else
                    this.selected.add(key);

                return this.onChange(cancel_cb);
            }

            this.toggle(false);

            if (this.selected.has(key))
                return;

            this.selected = new Set([key]);

            this.onChange(cancel_cb);
        },

        moveTarget(dir) {
            this.targetIdx = (
                this.targetIdx + this.items.length + dir
            ) % this.items.length;

            const {container} = this.$refs;
            const child_item = container.childNodes[this.targetIdx];
            const container_height = container.offsetHeight;
            const offset = this.isTop ? 31 : -9;
            const child_offset = child_item.offsetTop + offset;
            const child_height = child_item.offsetHeight;

            container.scrollTop = Math.max(
                Math.min(
                    container.scrollTop,
                    child_offset
                ),
                child_offset + child_height - container_height
            );
        },

        onChange(cancel_cb) {
            if (this.isMultiple) {
                this.$emit("update:values", [...this.selected]);
                this.$emit(
                    "change",
                    this.items.filter(it =>
                        this.selected.has(it[this.itemKey])
                    ),
                    cancel_cb
                );
                return;
            }

            const key = this.selected.values().next().value;

            if (key === undefined)
                return;

            this.$emit("update:value", key);
            this.$emit("change", [this.getItemByKey(key)], cancel_cb);
        },

        onScroll({srcElement: el}) {
            if (Math.ceil(el.offsetHeight + el.scrollTop) >= el.scrollHeight)
                this.$emit("scroll-finished");
        },

        onSubmit() {
            if (this.foundItems.length == 1)
                this.targetIdx = 0;

            const item = this.foundItems[this.targetIdx];

            if (item)
                this.selectItem(item);
        },

        search(query = "") {
            this.searchQuery = query.toLocaleLowerCase();

            this.targetIdx = -1;
        },

        reset() {
            this.selected.clear();
        }
    },

    watch: {
        value(new_value) {
            this.selected = new_value ? new Set([new_value]) : new Set();
        },

        values(new_values) {
            this.selected = new Set(new_values);
        },

        bottomBound() {
            this.isTop = window.innerHeight - this.bottomBound < 250;
        },

        items() {
            this.selected = new Set();
        }
    }
};
</script>

<template>
    <div
        ref="dropdown"
        class="dropdown"
        :class="{
            top: this.isTop,
            open: this.isOpen,
            searchable: this.isSearchable,
            multiple: this.isMultiple,
            disabled: this.disabled
        }"
        @click="toggle"
    >
        <h1>
            <slot v-if="noPreview || !selected.size"/>
            <span v-else-if="selected.size == 1">
                {{ getItemByKey([...selected][0])?.[itemName] }}
            </span>
            <span v-else>
                {{
                    [...selected].slice(0, maxMultiple)
                        .map(key => getItemByKey(key)[itemName])
                        .join(", ")
                    + (selected.size > maxMultiple ? " +" + (selected.size - maxMultiple) : "")
                }}
            </span>
        </h1>
        <div
            class="dropdown-content"
            v-if="isOpen"
            :style="{width: width + 'px'}"
        >
            <input
                ref="search-bar"
                v-if="isSearchable"
                class="search-bar"
                placeholder="Search..."
                @keydown.enter.stop="onSubmit"
                @keydown.esc.stop="toggle(false)"
                @keydown.up.stop="moveTarget(-1)"
                @keydown.down.stop="moveTarget(1)"
                @input="e => search(e.target.value)"
            >
            <ul ref="container" @scroll="onScroll">
                <template v-for="(item, i) in foundItems">
                    <li
                        :class="{selected: selected.has(item[itemKey]), target: i == targetIdx}"
                        @click.stop="() => selectItem(item)"
                    >
                        {{ item[itemName] }}
                    </li>
                </template>
            </ul>
        </div>
    </div>
</template>

<style>
.dropdown {
    display: flex;
    flex-direction: row;
    min-width: 150px;
    color: var(--light-grey-1);
    padding: 10px 15px;
    background: var(--white-grey);
    background-size: 20px;
    border: none;
    border-radius: 5px;
    outline: none;
    user-select: none;
    cursor: pointer;
    transition: background .15s ease-in-out;
}

.dropdown::after {
    display: block;
    content: "";
    width: 20px;
    height: 20px;
    margin: 0 0 0 auto;
    background: url("/icons/chevron-down.svg") no-repeat center;
    background-size: cover;
    transition: transform .2s ease-in-out;
}

.dropdown.disabled {
    opacity: .7;
    pointer-events: none;
}

.dropdown.top::after {
    transform: rotate(180deg);
}

.dropdown:hover, .dropdown:focus, .dropdown.open {
    background: var(--see-through-grey);
}

.dropdown.open {
    border-radius: 5px 5px 0 0;
}

.dropdown.top.open {
    border-radius: 0 0 5px 5px;
}

.dropdown.open::after {
    transform: rotate(180deg);
}

.dropdown.top.open::after {
    transform: rotate(0);
}

.dropdown > h1 {
    margin: 0;
    font-size: 12pt;
    font-weight: normal;
}

.dropdown.open > h1 {
    color: var(--light-grey-2);
}

.dropdown-content {
    position: absolute;
    display: flex;
    flex-direction: column;
    max-height: 300px;
    margin: 30px 0 0 -15px;
    z-index: 1;
    border-radius: 0 0 5px 5px;
    overflow: hidden;
}

.dropdown.top .dropdown-content {
    flex-direction: column-reverse;
    border-radius: 5px 5px 0 0;
    transform: translateY(-100%);
    margin-top: -10px;
}

.dropdown-content input.search-bar {
    width: 100%;
    min-height: 40px;
    border-radius: 0;
    background: url("/icons/search-black.svg") no-repeat center left 6px var(--white-grey);
    background-size: 20px;
    padding: 0 10px 0 30px;
}

.dropdown-content > input.search-bar::before {
    position: relative;
    content: "";
    width: 20px;
    height: 20px;
    z-index: 100;
}

.dropdown-content > ul {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    background-color: var(--white-grey);
    list-style: none;
    overflow: auto;
    z-index: 1;
}

.dropdown.searchable > ul {
    margin-top: 50px;
}

.dropdown-content > ul > li {
    padding: 5px 10px;
    border-radius: 5px;
    word-wrap: break-word;
    transition: background-color .2s ease-in-out;
}

.dropdown-content > ul > li:hover, .dropdown-content > ul > li.target {
    background: var(--see-through-grey);
    box-shadow: var(--see-through-black-2) 0 0 8px;
}

.dropdown.multiple > .dropdown-content > ul > li {
    padding-left: 30px;
}

.dropdown.multiple > .dropdown-content > ul > li:before {
    content: "";
    display: inline-block;
    border: 1px solid var(--light-grey-1);
    width: 10px;
    height: 10px;
    margin: 5px 10px 0 -20px;
    border-radius: 4px;
}

.dropdown.multiple > .dropdown-content > ul > li.selected:before {
    background: url("/icons/checkbox.svg") var(--light-grey-1) no-repeat center;
    background-size: 90%;
}
</style>
