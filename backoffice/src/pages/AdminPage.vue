<script>
import Api from "../services/Api.js";

export default {
    data() {
        return {
            buttonText: "Click to Create Account Link",
            isLinkCopied: false,
        };
    },
    methods: {
        async createAccountLink() {
            const {data: {token}} = await Api.signupToken();

            if (!token) {
                this.$root.showToast("Impossible to create account link", {
                    type: "error",
                    duration: 4000,
                });
                return;
            }

            const link = `${window.location.origin}/sign-up?token=${token}`;

            await navigator.clipboard.writeText(link);

            this.buttonText = "Link copied to clipboard";
            this.isLinkCopied = true;

            this.$root.showToast(this.buttonText, {
                type: "success",
                duration: 4000,
            });
            setTimeout(() => {
                this.buttonText = "Click to Create Account Link";
                this.isLinkCopied = false;
            }, 4000);
        },
    },
};
</script>

<template>
    <div class="admin-page">
        <h1>Welcome to the Admin Panel</h1>
        <div class="options">
            <button class="black" @click="$router.push('/admin/users')">User Panel</button>
            <button class="black" @click="createAccountLink" :disabled="isLinkCopied">
                {{ buttonText }}
            </button>
        </div>
        </div>
</template>

<style>
.admin-page {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    background: var(--white-color);
}

.admin-page h1 {
    position: absolute;
    top: 200px;
    font-size: 28px;
    margin-bottom: 20px;
}

.admin-page button {
    top: 270px;
    margin: 4px;
    color: var(--mid-grey);
}

.admin-page .options {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
