<template>
    <div class="page-section-wrapper">
        <slot></slot>
    </div>
</template>

<script>
export default {
    name: "PageSection",
};
</script>

<style scoped>
.page-section-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
    background: var(--white-color);
    padding: 15px 20px;
    border-radius: 10px;
}
</style>
