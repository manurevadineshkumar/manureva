<script>
import Api from "../services/Api.js";
export default {
    data() {
        return {
            email: "",
            showSuccessMessage: false,
        };
    },
    computed: {
        isAuthorized() {
            return !!this.user;
        },
        isFormValid() {
            return (
                this.email
            );
        },
    },
    methods: {
        /**
         * Resets the user's password.
         * @returns {string} - Success message indicating that the password has been reset.
         */
        async submitForm() {
            try {
                const { data } = await Api.forgetPassword({
                    email: this.email
                });
                if (data.error) {
                    this.$root.showToast(`Error: ${data.error}`, {
                        type: "error",
                        duration: 3000,
                    });
                    return;
                } else {
                    this.showSuccessMessage = true;
                    return this.$root.showToast(`Reset password link sent to your email : ${this.email}`, {
                        type: "success",
                        duration: 8000,
                    });

                }
            } catch (error) {
                console.error("Error:", error);
            }
        },

        /**
         * Redirects to the sign-in page.
         */
        async returnLogin() {
            this.$router.push({ path: "/" });
        },
    },
};
</script>

<template>
    <main class="page index-page">
        <h1 v-if="!showSuccessMessage">Reset password</h1>
        <div v-if="showSuccessMessage">
            <p class="showSuccessMessage_title">Password Reset Email Sent</p>
            <div class="showSuccessMessage_image">
                <font-awesome-icon icon="fa-solid fa-circle-check" style="color: var(--regular-green);"/>
            </div>
            <p>An email has been sent to rescue email address,<strong>{{ email }}</strong> follow the directions in the
                email to
                reset
                your password.</p>
        </div>
        <form v-if="!showSuccessMessage" @submit.prevent="submitForm" id="forgetpassword-form">
            <div>
                <label for="email">Enter your email address and we'll send you a link to reset your
                    password.</label>
                <input type="email" id="forget_email" v-model="email" required>
            </div>
            <button type="submit" id="forget-password-btn" :disabled="!isFormValid">RESET PASSWORD</button>
            <p v-on:click.prevent="returnLogin" id="return_signin">Return to Sign in >></p>
        </form>
    </main>
</template>

<style>
#forget_email {
    width: 450px;
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    margin: 30px auto;
}

#forget-password-btn {
    margin: 20px 0 10px 0;
    width: 300px;
}

#forgetpassword-form {
    text-align: center;
}

main.index-page {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

h1 {
    text-align: center;
}

#return_signin {
    cursor: pointer;
}

.showSuccessMessage_image {
    text-align: center;
    font-size: 100px;
}

.showSuccessMessage_title {
    font-family: Avenue_Mono;
    margin: 0;
    font-size: 2rem;
    text-align: center;
    font-weight: 600;
}
</style>
