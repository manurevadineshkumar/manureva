<script>
export default {
    props: {
        items: {
            type: Array,
            required: true,
        },
    },

    methods: {
        selectOption(option) {
            if (typeof option.action === "function") {
                option.action();
            } else {
                console.warn("No action defined for option:", option);
            }
        },
    },
};
</script>

<template>
    <div class="nav-menu">
        <slot/>
        <ul class="nav-menu-style">
            <li v-for="option in items" :key="option" @click="selectOption(option)">
                {{ option.label }}
            </li>
        </ul>
    </div>
</template>

<style>
.nav-menu {
    position: relative;
}

.nav-menu-style {
    position: absolute;
    top: 100%;
    left: 0;
    max-height: 200px;
    border-radius: 4px;
    box-shadow: 0 2px 4px #0003;
    list-style: none;
    display: none;
    padding: 0;
    margin: 0;
    z-index: 1;
}
.nav-menu.right .nav-menu-style {
    left: unset;
    right: 0;
}

.nav-menu:hover .nav-menu-style {
    display: block;
    overflow: hidden;
}

.nav-menu-style li {
    padding: 10px 20px;
    background: var(--grey);
    cursor: pointer;
}

.nav-menu-style li:hover {
    background: var(--mid-grey);
}
</style>
