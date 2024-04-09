<template>
    <div class="page-layout">
        <slot></slot>
    </div>
</template>

<script>
export default {
    name: "PageLayout",
};
</script>

<style scoped>
.page-layout {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 20px;
    gap: 20px;
}
</style>
