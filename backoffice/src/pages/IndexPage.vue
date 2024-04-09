<script>
import Api from "../services/Api.js";

import Statistics from "../components/Statistics.vue";

export default {
    data() {
        return {
            username: "",
            password: "",
        };
    },

    computed: {
        isAuthorized() {
            return !!this.user;
        }
    },

    methods: {
        async signIn() {
            const { data: { error } } = await Api.signIn({
                username: this.username,
                password: this.password
            });

            if (error) {
                this.$root.showToast(`Error: ${error}`, {
                    type: "info",
                    duration: 3000,
                });
            }

            this.user = Api.user;

            this.$root.authorize();
        },
        async redirectToSelectionPage() {
            const classicsTagId = 89;
            const query = { tag_ids: [classicsTagId] };
            this.$router.push({ path: "/selection", query: query });
        },
        async forgetPassword() {
            this.$router.push({ path: "/forgot-password" });
        },
        async signup() {
            this.$router.push({ path: "/sign-up" });
        }
    },

    components: {
        Statistics,
    }
};
</script>

<template>
    <main class="page index-page" :class="{ authorized: isAuthorized }">
        <h1 v-if="!isAuthorized">SIGN IN TO YOUR ACCOUNT</h1>
        <form v-if="!isAuthorized" class="login-form" v-on:submit.prevent="signIn">
            <label for="username-input">Username</label>
            <input id="username-input" type="text" autocomplete="username" minlength="3" v-model="username">
            <label for="password-input">Password</label>
            <input id="password-input" type="password" autocomplete="current-password" minlength="8" v-model="password">
            <p v-on:click.prevent="forgetPassword" id="forgetPassword">Forget Password?</p>
            <button class="black sliding" type="submit">Login</button>
            <button class="black sliding" id="signup" v-on:click.prevent="signup">Signup</button>
        </form>
        <router-link v-if="isAuthorized" :to="redirectToSelectionPage()" />

        <statistics v-if="isAuthorized && Api.user.permissions.has('STATISTICS_READ')" />
    </main>
</template>

<style>
main.index-page {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

main.index-page h1 {
    text-align: center;
}

main.index-page.authorized {
    justify-content: flex-start;
}

main.index-page:empty::after {
    content: "Korvin backoffice";
    flex: 1;
    font-size: 36pt;
    text-align: center;
    opacity: .15;
}

.login-form {
    width: 300px;
    display: flex;
    flex-direction: column;
    justify-content: stretch;
}

.login-form input {
    margin: 0 0 10px 0;
}

.login-form label {
    padding: 0 0 5px 0;
}

.login-form button {
    margin: 10px 0 0 0;
}

.login-form button:hover {
    background-color: var(--black-grey);
}

.login-form #signup {
    color: var(--mid-grey);
}

.login-form #signup:hover {
    color: var(--white-color)
}

.login-form #forgetPassword {
    cursor: pointer;
    margin: 5px 0 20px 0;
    color: var(--midnight-blue);
}

.login-form #forgetPassword:hover {
    color: var(--sapphire-blue);
}

.login-form button:hover.black {
    border: 1px solid var(--black-grey);
}
</style>
