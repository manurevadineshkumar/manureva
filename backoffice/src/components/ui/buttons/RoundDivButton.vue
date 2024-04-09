<template>
    <div class="round-button" role="button">
        <slot></slot>
    </div>
</template>

<script>
export default {
    name: "RoundButton",
};
</script>

<style scoped>
.round-button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 1px solid var(--light-grey-1);
    color: var(--light-grey-1);
    cursor: pointer;
    transition: all .2s ease-in-out;
}

.round-button:hover {
    color: var(--white-color);
    background-color: var(--black-grey);
}

.round-button:disabled {
    background-color: var(--black-grey);
    cursor: not-allowed;
}
</style>
