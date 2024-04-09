<script>
import Api from "../services/Api.js";
import DynamicDropdown from "@/components/dropdowns/DynamicDropdown.vue";

export default {
    components: { DynamicDropdown },
    data() {
        return {
            user: { address: {} },
            originalUser: null,
            isEditing: false,
            certificates: [],
            section: "information",
            paymentMethods: [],
            newPassword: "",
            confirmPassword: "",
            shownewPassword: true,
            showconfirmPassword: true
        };
    },

    async mounted() {
        await this.fetchUserData();
        await this.fetchPaymentMethods();
    },
    computed: {
        isFormValid() {
            return this.newPassword && this.confirmPassword;
        },
    },

    methods: {
        /**
         * Fetches the user data from the API and serializes it.
         * @returns {Promise<void>}
         */
        async fetchUserData() {
            this.user = (await Api.getUser()).serialize();
        },

        /**
         * Fetches the payment methods for the current user.
         * @returns {Promise<void>}
         */
        async fetchPaymentMethods() {
            const { data } = await Api.listStripePaymentMethods();

            if (data.error) {
                this.$root.showToast(`Error: ${data.error}`, {
                    type: "error",
                    duration: 3000,
                });
                return;
            }

            this.paymentMethods = data;
        },

        /**
         * Sends updated fields to the API and fetches the updated user object
         * @returns {Promise<void>}
         */
        async updateUser() {
            const updatedProps = {};
            for (const prop in this.user) {
                if (
                    prop === "address" && JSON.stringify(this.originalUser[prop]) !== JSON.stringify(this.user[prop])
                    || this.originalUser[prop] !== this.user[prop] && prop !== "address"
                ) {
                    updatedProps[prop] = this.user[prop];
                }
            }
            this.isEditing = false;
            if (Object.keys(updatedProps).length === 0) {
                this.$root.showToast("Nothing to update", {
                    type: "error",
                    duration: 3000,
                });
                return;
            }

            const { data: { error }, status } = await Api.updateUser(
                this.originalUser.id, updatedProps
            );

            if (status === 200) {
                this.$root.showToast("User fields updated", {
                    type: "success",
                    duration: 2000,
                });
            } else {
                this.$root.showToast(`Error: ${error}`, {
                    type: "error",
                    duration: 3000,
                });
            }
            await this.fetchUserData();
        },

        /**
         * Allows the user to edit the profile.
         * It creates a copy of the user object to compare it later.
         * Set isEditing to true to allow the user to edit the profile.
         * @returns {void}
         */
        editProfile() {
            this.originalUser = JSON.parse(JSON.stringify(this.user));
            this.isEditing = true;
        },

        /**
         * Cancels the editing of the profile if the user is in editing mode.
         * Change section to the parameter given to change the section of the profile.
         * @param {"information"|"certificates"|"payment"} section
         * @returns {void}
         */
        changeSection(section) {
            this.isEditing = false;
            this.section = section;
        },

        /**
         * Downloads the certificate.
         * It calls the API to download the certificate.
         * It creates a link to download the certificate.
         * It shows a toast message to inform the user that the certificate is downloading.
         * It removes the link.
         * It revokes the URL.
         * If there is an error during the process to download the certificate, it shows a toast error message.
         * @param {string} certificate - The UUID of the certificate.
         * @returns {Promise<void>}
         */
        async downloadCertificate(certificate) {
            const blob = await Api.downloadCertificate(certificate);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");

            a.href = url;
            a.download = certificate;
            document.body.appendChild(a);
            a.click();
            this.$root.showToast("Downloading certificate", {
                type: "success",
                duration: 2000,
            });
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        },

        /**
         * Deletes the certificate.
         * It calls the API to delete the certificate.
         * If there is an error during the process to delete the certificate, it shows a toast error message.
         * If the certificate is deleted successfully, it shows a toast success message
         * Removes the certificate from the user object.
         * @param {string} certificate - The UUID of the certificate.
         * @param {number} index - The index of the certificate in the user object.
         * @returns {Promise<void>}
         */
        async deleteCertificate(certificate, index) {
            if (!confirm("Are you sure you want to delete this certificate?"))
                return;

            const { data: { error }, status } = await Api.deleteCertificate(
                certificate
            );

            if (status !== 200) {
                this.$root.showToast(`Error: ${error}`, {
                    type: "error",
                    duration: 3000,
                }
                );
            } else {
                this.$root.showToast("Certificate deleted", {
                    type: "success",
                    duration: 2000,
                });
                this.user.certificates.splice(index, 1);
            }
        },

        /**
         * Adds the certificates to the certificates object.
         * @param {Event} event - The event of the input file.
         * @returns {Promise<void>}
         */
        async addCertificate(event) {
            const files = event.target.files;

            this.certificates = Array.from(files);
        },

        /**
         * Uploads user certificates
         * @returns {Promise<void>}
         */
        async uploadCertificates() {
            if (this.certificates.length >= 5)
                return this.$root.showToast(
                    "You can only upload 5 certificates",
                    {
                        type: "warning",
                        duration: 3000,
                    }
                );

            const form_data = new FormData();

            this.certificates.forEach(cert =>
                form_data.append("certificates", cert)
            );

            const { data: { error } } = await Api.uploadUserCertificates({
                certificates: form_data,
            });

            if (error)
                return this.$root.showToast(`Error: ${error}`, {
                    type: "error",
                    duration: 3000,
                });

            this.$root.showToast("Certificates uploaded successfully", {
                type: "success",
                duration: 2000,
            });

            this.$refs["file-upload"].value = null;

            await this.fetchUserData();
        },

        async addPaymentMethod() {
            const { data: { error, url } } = await Api.addStripePaymentMethod();

            if (error) {
                return this.$root.showToast(`Error: ${error}`, {
                    type: "error",
                    duration: 3000,
                });
            }

            window.open(url, "_blank");
        },

        async deletePaymentMethod(pm_id) {
            const { data: { error } } = await Api.deleteStripePaymentMethod(pm_id);

            if (error) {
                return this.$root.showToast(`Error: ${error}`, {
                    type: "error",
                    duration: 3000,
                });
            }

            this.$root.showToast("Payment method deleted", {
                type: "success",
                duration: 3000,
            });

            await this.fetchPaymentMethods();
        },
        togglenewPassword() {
            this.shownewPassword = !this.shownewPassword;
        },
        toggleconfirmPassword() {
            this.showconfirmPassword = !this.showconfirmPassword;
        },

        /**
         * Changes the password for the user.
         * Checks if Password and Confirm Password match.
         * If successful, updates the password and redirects to the sign-out page.
         */
        async ChangePassword() {

            try {
                if (this.newPassword !== this.confirmPassword) {
                    return this.$root.showToast(`Password and Confirm Password does not match.`, {
                        type: "error",
                        duration: 8000,
                    });
                }
                const resetPassword = await Api.changePassword({
                    currentUseID: this.user.id.toString(),
                    password: this.newPassword
                });
                if (resetPassword.status !== 200) {
                    return this.$root.showToast(`Error: ${resetPassword.data.error.message}`, { type: "error" });
                } else {
                    this.newPassword = "";
                    this.confirmPassword = "";
                    this.$root.showToast(`Password Updated Successfully.`, {
                        type: "success",
                        duration: 1000,
                    });
                    this.$router.push({ path: "/sign-out" });
                }
            } catch (error) {
                console.error("Error resetting password:", error);
            }
        }
    },
};
</script>

<template>
    <main class="page">
        <section class="profile-page">
            <h1>PROFILE</h1>
            <div class="profile-header">
                <button :class="{ actual: section === 'information' }" :disabled="section === 'information'"
                    @click="changeSection('information')">Information</button>
                <button :class="{ actual: section === 'certificates' }" :disabled="section === 'certificates'"
                    @click="changeSection('certificates')">Certificates
                </button>
                <button :class="{ actual: section === 'payment' }" :disabled="section === 'payment'"
                    @click="changeSection('payment')">Payment</button>
                <button :class="{ actual: section === 'ChangePassword' }" :disabled="section === 'ChangePassword'"
                    @click="changeSection('ChangePassword')">Change password</button>
            </div>
            <form class="information-section" :class="{ 'not-editing': !isEditing }" @submit.prevent="updateUser"
                v-if="section === 'information'">
                <div class="information-part">
                    <div>
                        <label>First Name:</label>
                        <input type="text" v-model="user.first_name" minlength="3" maxlength="32" :readonly="!isEditing"
                            required />
                    </div>
                    <div>
                        <label>Last Name:</label>
                        <input type="text" v-model="user.last_name" minlength="3" :readonly="!isEditing" required />
                    </div>
                    <div>
                        <label>Username:</label>
                        <input type="text" v-model="user.username" minlength="3" maxlength="16" :readonly="!isEditing"
                            required />
                    </div>
                    <div>
                        <label>Email:</label>
                        <input type="text" v-model="user.email" minlength="3" maxlength="32" :readonly="!isEditing"
                            required />
                    </div>
                    <div>
                        <label>Phone:</label>
                        <input type="text" v-model="user.phone" minlength="7" :readonly="!isEditing" required />
                    </div>
                </div>
                <div class="information-part">
                    <div>
                        <label>Address Street:</label>
                        <input type="text" v-model="user.address.street" minlength="3" maxlength="64"
                            :readonly="!isEditing" required />
                    </div>
                    <div>
                        <label>Address City:</label>
                        <input type="text" v-model="user.address.city" minlength="3" maxlength="64"
                            :readonly="!isEditing" required />
                    </div>
                    <div>
                        <label>Address Zip:</label>
                        <input type="text" v-model="user.address.zip" minlength="3" maxlength="16"
                            :readonly="!isEditing" required />
                    </div>
                    <div>
                        <label>Address Country:</label>
                        <dynamic-dropdown is-searchable v-model:value="user.address.country_id"
                            :listing-function="Api.listCountries" :disabled="!isEditing">Choose
                            country...</dynamic-dropdown>
                    </div>
                </div>
                <div class="information-part">
                    <div>
                        <label>Company Name:</label>
                        <input type="text" v-model="user.company_name" minlength="3" maxlength="160"
                            :readonly="!isEditing" required />
                    </div>
                    <div>
                        <label>Company VAT:</label>
                        <input type="text" v-model="user.company_vat" minlength="3" maxlength="32"
                            :readonly="!isEditing" required />
                    </div>
                    <div>
                        <label>Url:</label>
                        <input type="text" v-model="user.url" minlength="3" maxlength="256" :readonly="!isEditing"
                            required />
                    </div>
                </div>
                <div class="information-part">
                    <div>
                        <label>Instagram:</label>
                        <input type="text" v-model="user.instagram" minlength="3" maxlength="64" :readonly="!isEditing"
                            required />
                    </div>
                    <div>
                        <label>Facebook:</label>
                        <input type="text" v-model="user.facebook" minlength="3" maxlength="64" :readonly="!isEditing"
                            required />
                    </div>
                    <div>
                        <label>Tiktok:</label>
                        <input type="text" v-model="user.tiktok" minlength="3" maxlength="64" :readonly="!isEditing"
                            required />
                    </div>
                    <div>
                        <label>Linkedin:</label>
                        <input type="text" v-model="user.linkedin" minlength="3" maxlength="64" :readonly="!isEditing"
                            required />
                    </div>
                </div>
                <button @click="editProfile" class="update-button blue" v-if="!isEditing">Edit</button>
                <button class="update-button success" v-else>Update</button>
            </form>
            <div class="certificates-section" v-if="section === 'certificates'">
                <div v-for="(certificate, index) in user.certificates" :key="certificate" class="certificate-file">
                    <span>{{ certificate }}</span>
                    <button class="mini-button action-delete" @click="deleteCertificate(certificate, index)" />
                    <button class="mini-button action-download" @click="downloadCertificate(certificate)" />
                </div>
                <input type="file" ref="file-upload" accept="application/pdf" multiple @change="addCertificate" />
                <button v-if="certificates.length > 0" class="confirm-button success"
                    @click="uploadCertificates">Confirm</button>
            </div>
            <template v-if="section === 'payment'">
                <section class="payment-method">
                    <h2>Payment method</h2>
                    <template v-if="paymentMethods.length === 0">
                        <p>No payment method registered</p>
                    </template>
                    <template v-else>
                        <p>Payment method registered</p>
                        <div class="payment-method-list">
                            <div v-for="paymentMethod in paymentMethods" class="payment-method-card"
                                :key="paymentMethod.id">
                                <template v-if="paymentMethod.type === 'card'">
                                    <p>Type: Card</p>
                                    <p>Last digits: {{ paymentMethod.card.last4 }}</p>
                                    <p>Expires: {{ paymentMethod.card.exp_month }} / {{ paymentMethod.card.exp_year }}
                                    </p>
                                </template>
                                <template v-else>
                                    <p>Type: {{ paymentMethod.type }}</p>
                                </template>
                                <button class="payment-method-delete"
                                    @click="() => deletePaymentMethod(paymentMethod.id)">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </template>
                    <button @click="addPaymentMethod">Add payment method</button>
                </section>
            </template>
            <template v-if="section === 'ChangePassword'">
                <section class="change_password_section">
                    <form @submit.prevent="ChangePassword" id="ChangePassword-form">
                        <div class="newPassword">
                            <label for="newPassword">New Password:</label>

                            <input :type="[shownewPassword ? 'password' : 'text']" id="newPassword"
                                v-model="newPassword" :class="{ 'show-password': shownewPassword }" minlength="8"
                                required />
                                <div id="eye-icons" @click="togglenewPassword">
                                   <font-awesome-icon :icon="shownewPassword ?
                                   'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                                   style="color: var(--mid-grey);" />
                                </div>
                        </div>
                        <br>
                        <div class="confirmPassword">
                            <label for="confirmPassword">Confirm Password:</label>
                            <input :type="[showconfirmPassword ? 'password' : 'text']" id="confirmPassword"
                                v-model="confirmPassword" :class="{ 'show-password': showconfirmPassword }"
                                minlength="8" required />
                                <div id="eye-icons" @click="toggleconfirmPassword">
                                    <font-awesome-icon :icon="showconfirmPassword ?
                                    'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                                    style="color: var(--mid-grey);" />
                                </div>
                        </div>
                        <div id="change-password-btn"><button type="submit" :disabled="!isFormValid">Change
                                Password</button></div>
                    </form>
                </section>
            </template>
        </section>
    </main>
</template>

<style>
.certificates-section input[type="file-upload-button"] {
    background-color: var(--see-through-grey);
}

.profile-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--white-color);
    padding: 15px 20px;
    border-radius: 10px;
    flex: 1;
    overflow: scroll
}

.profil button {
    border-width: 1px;
    font-size: 14px;
}

.profile-page>h1 {
    font-size: 2rem;
    text-align: center;
    padding: 10px;
    margin: 0;
}

.profile-page label,
form#resetpassword-form label {
    display: flex;
    font-size: 14pt;
    width: 90px;
}

.profile-page>.profile-header {
    gap: 10px;
    display: flex;
    flex-wrap: wrap;
    padding: 10px;
}

.profile-page>.profile-header button.actual {
    --color: var(--see-through-grey);
    --bg-color: var(--black-color);
    opacity: .75;
    cursor: default;
}

.profile-page>.information-section {
    display: flex;
    flex-wrap: wrap;
    gap: 50px;
    flex: 1;
}

.profile-page>.information-section .update-button {
    width: 100%;
    align-self: flex-end;
    height: 48px;
}

.profile-page>.information-section .information-part {
    display: flex;
    flex-direction: column;
}

.profile-page>.information-section .information-part>div,
.profile-page>.change_password_section form>div {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 20px;
}

.profile-page .information-part>input:hover {
    cursor: default;
    background: var(--black-grey);
}

.profile-page>.certificates-section {
    margin-top: 25px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;
}

.profile-page>.certificates-section .confirm-button,
.profile-page>.certificates-section input {
    width: fit-content;
}

.profile-page>.certificates-section .certificate-file {
    display: flex;
    gap: 15px;
}

.profile-page>.certificates-section .certificate-file>span {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 15px;
    background: var(--white-grey);
    color: var(--black-color);
    border-radius: 50px;
    width: 380px;
}

.profile-page .payment-method {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.profile-page .payment-method-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 10px;
}

.profile-page .payment-method-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 200px;
    min-height: 100px;
    border: solid var(--light-grey-1);
    border-radius: 20px;
}

.profile-page .payment-method-delete {
    color: red;
    border-color: red;
    margin: 5px;
}

@media only screen and (max-width: 600px) {
    .profile-page>.profile-header>button {
        width: 100%;
    }

    .profile-page>.information-section {
        gap: 10px;
    }

    .profile-page>.information-section .information-part {
        width: 100%;
        padding: 5px 0;
        gap: 10px;
    }

    .profile-page>.information-section .information-part label {
        width: 90px;
    }

    .profile-page>.information-section .information-part input {
        width: 100%;
    }

    .profile-page>.certificates-section .certificate-file {
        flex-wrap: wrap;
        justify-content: center
    }
}

section.change_password_section {
    width: 600px;
}

div#change-password-btn {
    margin-top: 20px;
}

form#ChangePassword-form #eye-icons {
    margin-left: -40px;
}
</style>
