<script>
export default {
    props: {
        text: {
            type: String,
            required: true,
        },
    },
};
</script>

<template>
    <span class="tooltip">{{ text }}</span>
</template>

<style>
.tooltip {
    visibility: hidden;
    position: absolute;
    left: 100%;
    width: 200px;
    background-color: var(--black-color);
    color: var(--off-white);
    text-align: center;
    border-radius: 6px;
    padding: 10px;
    margin: -8px 0 0 10px;
    border: none;
    box-shadow: 0 0 4px var(--see-through-black-2);
    opacity: 0;
    transition: all ease-in-out 0.2s;
    pointer-events: none;
    z-index: 1;
}

.tooltip::before {
    content: "";
    position: absolute;
    width: 0;
    height: 0;
    left: 0;
    margin: 0 0 0 -20px;
    border: 10px solid transparent;
    border-right-color: var(--black-color);
}

*:hover > .tooltip {
    visibility: visible;
    opacity: 1;
    margin: -8px 0 0 0;
}
</style>
