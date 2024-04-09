<script>
import Api from "../services/Api.js";

export default {
    data() {
        return {
            token: null,
            newPassword: "",
            confirmPassword: "",
            showResetForm: false,
            showTokenExpiredMessage: false,
            tokenExpiry: null,
            currentUseID: null,
            shownewPassword: true,
            showconfirmPassword: true
        };
    },
    mounted() {
        this.token = new URLSearchParams(window.location.search).get("token");
        const user = this.token.split("_");
        this.currentUseID = user[0];
        if (this.token) {
            this.checkTokenValidity();
        }

    },
    computed: {
        isFormValid() {
            return this.newPassword && this.confirmPassword;
        },
    },
    methods: {
        /**
         * Toggle function to show or hide the newPassword.
         */
        togglenewPassword() {
            this.shownewPassword = !this.shownewPassword;
        },

        /**
         * Toggle function to show or hide the confirmPassword.
         */
        toggleconfirmPassword() {
            this.showconfirmPassword = !this.showconfirmPassword;
        },

        /**
         * Checks the validity of a user token.
         * @param {string} token - The token to be checked.
         * @returns {boolean} - True if the token is valid, otherwise false.
         */
        async checkTokenValidity() {
            try {
                const response = await Api.checkTokenValidity({ token: this.token });
                if (response.data.success === false) {
                    this.showTokenExpiredMessage = true;

                    return this.$root.showToast(`The token has expired or is invalid. Please renew it to proceed.`, {
                        type: "error",
                        duration: 8000,
                    });
                } else {
                    this.showResetForm = true;
                }
            } catch (error) {
                console.error("Error checking token validity:", error);
            }
        },

        /**
         * Functionality to reset the password.
         * Checks if Password and Confirm Password match.
         * Redirects to the sign-in page.
         */
        async resetPassword() {
            try {
                if (this.newPassword !== this.confirmPassword) {
                    return this.$root.showToast(`Password and Confirm Password does not match.`, {
                        type: "error",
                        duration: 8000,
                    });
                }
                const resetPassword = await Api.resetPassword({
                    currentUseID: this.currentUseID,
                    password: this.newPassword, token: this.token
                });
                if (resetPassword.status !== 200) {
                    return this.$root.showToast(`Error: ${resetPassword.data.error.message}`, { type: "error" });
                } else {
                    this.$router.push({ path: "/" });
                    return this.$root.showToast(`Password Updated Successfully.`, {
                        type: "success",
                        duration: 1000,
                    });
                }
            } catch (error) {
                console.error("Error resetting password:", error);
            }
        }
    }
};
</script>

<template>
    <main class="page index-page">
        <h1>Reset Password</h1>
        <div v-if="!token || showTokenExpiredMessage">
            <p v-if="!token">No token found in URL.</p>
            <p v-if="showTokenExpiredMessage">The token has expired or is invalid. Please renew it to proceed.</p>
        </div>
        <form v-if="showResetForm" @submit.prevent="resetPassword" id="resetpassword-form">
            <div class="newPassword">
                <label for="newPassword">New Password:</label>

                <input :type="[shownewPassword ? 'password' : 'text']" id="newPassword" v-model="newPassword"
                    :class="{ 'show-password': shownewPassword }" minlength="8" required />
                    <div id="eye-icons" @click="togglenewPassword">
                    <font-awesome-icon :icon="shownewPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                        style="color: var(--mid-grey);" />
                    </div>
            </div>
            <br>
            <div class="confirmPassword">
                <label for="confirmPassword">Confirm Password:</label>
                <input :type="[showconfirmPassword ? 'password' : 'text']" id="confirmPassword"
                    v-model="confirmPassword" :class="{ 'show-password': showconfirmPassword }" minlength="8"
                    required />
                    <div id="eye-icons" @click="toggleconfirmPassword">
                    <font-awesome-icon :icon="showconfirmPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                        style="color: var(--mid-grey);" />
                    </div>
            </div>
            <button id="reset-password-btn" type="submit" :disabled="!isFormValid">Reset Password</button>
        </form>
    </main>
</template>

<style>
#resetpassword-form {
    width: 450px;
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    margin: 30px auto;
    position: relative;
}

#resetpassword-form input {
    width: 450px;
}

#reset-password-btn {
    margin: 40px 0 10px 0;
}

#resetpassword-form label {
    text-align: left;
}

.show-password {
    -webkit-text-security: none;
}

main.index-page {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.index-page h1 {
    text-align: center;
}

#return_signin {
    cursor: pointer;
}

.newPassword,
.confirmPassword {
    position: relative;
}

#resetpassword-form #eye-icons{
    position: absolute;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
    }

    #resetpassword-form .newPassword  #eye-icons{
        top: 68%;
    }

    #resetpassword-form .confirmPassword  #eye-icons{
        top: 69%;
    }

    #resetpassword-form #eye-icons {
        font-size: 1.2em;
        color: var(--see-through-grey);
    }

#resetpassword-form input.show-password {
    -webkit-text-security: none;
}
</style>
