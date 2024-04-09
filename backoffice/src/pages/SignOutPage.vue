<script>
import Api from "../services/Api.js";

export default {
    mounted() {
        Api.signOut().then(
            () => this.redirect(),
            () => this.redirect()
        );
    },

    methods: {
        redirect() {
            this.$root.signOut();
            this.$router.push("/");
        }
    }
};
</script>

<template/>
