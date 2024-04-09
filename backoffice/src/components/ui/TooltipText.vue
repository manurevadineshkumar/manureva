<script>
export default {

    props: {
        text: {
            type: String,
            required: true
        },
        location: {
            type: String,
            required: true
        },
        activator: {
            type: String,
            default: "parent"
        },
    },
};
</script>

<template>
    <v-tooltip open-on-click :location="this.location" :activator="this.activator">
        <v-sheet class="tooltip">{{ this.text }}</v-sheet>
    </v-tooltip>
</template>

<style>
.tooltip {
    backdrop-filter: blur(10px);
    background-color: var(--light-grey-1);
    color: var(--black-color);
    border-radius: 5px;
    padding: 5px;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-wrap: nowrap;
}
</style>
