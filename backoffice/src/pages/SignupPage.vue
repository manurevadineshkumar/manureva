<script>
import Api from "../services/Api";
import {VueTelInput} from "vue-tel-input";
import VueGoogleAutocomplete from "vue-google-autocomplete";
import DynamicDropdown from "@/components/dropdowns/DynamicDropdown.vue";

export default {
    components: {
        DynamicDropdown,
        VueTelInput,
        VueGoogleAutocomplete
    },

    data() {
        return {
            showPassword: false,
            certificates: [],
            country: null,
            account: {
                username: "",
                password: "",
                first_name: "",
                last_name: "",
                email: "",
                phone: "",
                address: {
                    street: "",
                    city: "",
                    zip: "",
                    country_id: null,
                },
                company_name: "",
                company_vat: "",
                url: "",
                instagram: "",
                tiktok: "",
                facebook: "",
                linkedin: "",
                reason: {
                    instant_purchase: false,
                    on_demand_retail: false,
                    access_b2b_network: false,
                    distribute_on_marketplaces: false,
                },
            },
            vueTel: {
                phone: "",
                bindProps: {
                    mode: "international",
                    defaultCountry: "FR",
                    disabledFetchingCountry: false,
                    disabled: false,
                    disabledFormatting: false,
                    placeholder: "Enter a phone number",
                    required: false,
                    enabledCountryCode: true,
                    enabledFlags: true,
                    preferredCountries: ["US", "GB", "JP", "FR", "DE", "IT"],
                    onlyCountries: [],
                    ignoredCountries: [],
                    autocomplete: "on",
                    name: "telephone",
                    maxLen: 25,
                    wrapperClasses: "",
                    inputClasses: "",
                    inputOptions: {
                        showDialCode: true,
                    },
                },
            },
        };
    },
    computed: {
        isFormValid() {
            return (
                this.account.username &&
                this.account.password &&
                this.account.first_name &&
                this.account.last_name &&
                this.account.email &&
                this.account.address.street &&
                this.account.address.city &&
                this.account.address.zip &&
                this.account.address.country_id &&
                this.account.company_name
            );
        },
    },

    methods: {
        /**
         * When the location found
         * @param {Object} addressData Data of the found location
         * @param {Object} placeResultData PlaceResult object
         */
        getAddressData(addressData, placeResultData) {
            this.account.address.street = placeResultData?.formatted_address ?? "";
            this.account.address.city = addressData?.locality ?? "";
            this.account.address.zip = addressData?.postal_code ?? "N/A";
        },

        async createAccount() {
            const token = new URLSearchParams(window.location.search).get("token");

            if (!token) {
                this.$root.showToast("No token", {type: "error", duration: 5000});
                return;
            }

            const formData = Object.fromEntries(
                Object.entries({...this.account}).filter(([_, v]) => v !== "")
            );

            const {data: {error}} = await Api.createUser(formData, token);

            if (error) {
                this.$root.showToast(`Error: ${error}`, {
                    type: "error",
                    duration: 5000,
                });
                return;
            }

            const formDataCertificate = new FormData();
            this.certificates.forEach((certificate) => {
                formDataCertificate.append("certificates", certificate);
            });

            const {data: {error: cert_err}} = await Api.uploadUserCertificates({
                certificates: formDataCertificate,
            });

            if (cert_err) {
                this.$root.showToast(`Error: ${cert_err}`, {
                    type: "error",
                    duration: 5000,
                });
            }

            this.$root.showToast("Account created successfully!", {
                type: "success",
                duration: 5000,
            });

            this.$root.showToast("Your account will be activated in 2-5 business days.", {
                type: "info",
                duration: 5000,
                redirect: "/",
            });
        },

        setCountry([country]) {
            this.country = country;
            this.account.address.country_id = country.id;
        },

        handleCertificateUpload(event) {
            const files = event.target.files;

            if (this.certificates.length === 5) {
                this.$root.showToast("You can only upload 5 certificates", {
                    type: "warning",
                    duration: 4000,
                });
                return;
            }
            this.certificates.push(...files);
        },

        removeCertificate(certificate) {
            const index = this.certificates.indexOf(certificate);
            if (index !== -1)
                this.certificates.splice(index, 1);
        }
    }
};
</script>

<template>
    <div class="account-creation-page">
        <form @submit.prevent="createAccount">
            <div class="container">
                <div class="block-container">
                    <div class="block">
                        <h2>Personal Information</h2>
                        <div class="field">
                            <label for="username">Username<span class="required">*</span>:</label>
                            <input
                                type="text"
                                id="username"
                                v-model="account.username"
                                minlength="3"
                                maxlength="16"
                                required
                            />
                        </div>
                        <div class="field">
                            <label for="first_name">First name<span class="required">*</span>:</label>
                            <input
                                type="text"
                                id="first_name"
                                v-model="account.first_name"
                                minlength="3"
                                maxlength="32"
                                placeholder="John"
                                required
                            />
                        </div>
                        <div class="field">
                            <label for="last_name">Last name<span class="required">*</span>:</label>
                            <input
                                type="text"
                                id="last_name"
                                v-model="account.last_name"
                                minlength="3"
                                maxlength="32"
                                placeholder="Doe"
                                required
                            />
                        </div>
                        <div class="field">
                            <label for="password">Password<span class="required">*</span>:</label>
                            <div>
                                <input
                                    :type="showPassword ? 'text' : 'password'"
                                    id="password"
                                    v-model="account.password"
                                    minlength="8"
                                    maxlength="64"
                                    required
                                />
                                <input type="checkbox" v-model="showPassword" class="show-password-checkbox" />
                            </div>
                        </div>
                        <div class="field">
                            <label for="confirm_password">Confirm password<span class="required">*</span>:</label>
                            <input
                                :type="showPassword ? 'text' : 'password'"
                                id="confirm_password"
                                v-model="account.confirm_password"
                                minlength="8"
                                maxlength="64"
                                placeholder="Confirm password"
                                :class="{
                                    error: !(account.password === account.confirm_password),
                                }"
                                required
                            />
                        </div>
                    </div>

                    <div class="block">
                        <h2>Contact Information</h2>
                        <div class="field">
                            <label for="email">Email<span class="required">*</span>:</label>
                            <input
                                type="email"
                                id="email"
                                v-model="account.email"
                                maxlength="320"
                                required
                                placeholder="example@mail.com"
                            />
                        </div>
                        <div class="field">
                            <label for="phone">Phone number:</label>
                            <vue-tel-input v-model="account.phone" v-bind="vueTel.bindProps"/>
                        </div>

                        <div class="field">
                            <label for="country">Country<span class="required">*</span>:</label>
                            <dynamic-dropdown
                                is-searchable
                                :listing-function="Api.listCountries"
                                @change="setCountry"
                            >Choose country...</dynamic-dropdown>
                        </div>
                        <div v-if="account.address.country_id" class="field">
                            <label for="street">Address<span class="required">*</span>:</label>
                            <vue-google-autocomplete
                                type="text"
                                id="street"
                                classname="form-control"
                                placeholder="Please type your address"
                                v-on:placechanged="getAddressData"
                                :country="country.code"
                            />
                        </div>
                        <div v-if="account.address.country_id" class="field">
                            <label for="city">City<span class="required">*</span>:</label>
                            <input
                                type="text"
                                id="city"
                                v-model="account.address.city"
                                minlength="1"
                                maxlength="64"
                                required
                            />
                        </div>
                        <div v-if="account.address.country_id" class="field">
                            <label for="zip">Zip code<span class="required">*</span>:</label>
                            <input
                                type="text"
                                id="zip"
                                v-model="account.address.zip"
                                minlength="1"
                                maxlength="16"
                                required
                            />
                        </div>
                    </div>
                </div>
                <div class="block-container">
                    <div class="block">
                        <h2>Company Information</h2>
                        <div class="field">
                            <label for="company_name">Company name<span class="required">*</span>:</label>
                            <input
                                type="text"
                                id="company_name"
                                v-model="account.company_name"
                                minlength="3"
                                maxlength="160"
                                required
                            />
                        </div>
                        <div class="field">
                            <label for="company_vat">Company VAT:</label>
                            <input
                                type="text"
                                id="company_vat"
                                v-model="account.company_vat"
                                placeholder="00.00"
                                minlength="3"
                                maxlength="32"
                            />
                        </div>
                        <div class="field">
                            <label for="url">URL:</label>
                            <input
                                type="url"
                                id="url"
                                v-model="account.url"
                                maxlength="256"
                                placeholder="https://example.com"
                            />
                        </div>
                        <div class="field certificate">
                            <label for="certificate">Certificate of incorporation (PDF):</label>
                            <input
                                type="file"
                                id="certificate"
                                accept="application/pdf"
                                multiple
                                @change="handleCertificateUpload"
                            />
                            <div class="uploaded-files">
                                <div v-for="certificate in certificates" :key="certificate.name" class="uploaded-file">
                                    <span>{{ certificate.name }}</span>
                                    <button @click="removeCertificate(certificate)">Remove</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="block">
                        <h2>Social Media</h2>
                        <div class="field">
                            <label for="instagram">Instagram:</label>
                            <input
                                type="url"
                                id="instagram"
                                v-model="account.instagram"
                                placeholder="https://instagram.com/"
                                maxlength="64"
                            />
                        </div>
                        <div class="field">
                            <label for="tiktok">Tiktok:</label>
                            <input
                                type="url"
                                id="tiktok"
                                v-model="account.tiktok"
                                placeholder="https://tiktok.com/"
                                maxlength="64"
                            />
                        </div>
                        <div class="field">
                            <label for="facebook">Facebook:</label>
                            <input
                                type="url"
                                id="facebook"
                                v-model="account.facebook"
                                placeholder="https://facebook.com/"
                                maxlength="64"
                            />
                        </div>
                        <div class="field">
                            <label for="linkedin">LinkedIn:</label>
                            <input
                                type="url"
                                id="linkedin"
                                v-model="account.linkedin"
                                placeholder="https://linkedin.com/"
                                maxlength="64"
                            />
                        </div>
                    </div>
                </div>

                <div class="block-container">
                    <div class="block">
                        <h2>I want to buy</h2>
                        <div class="field">
                            <input type="checkbox" id="instant-purchase" v-model="account.reason.instant_purchase" />
                            <label for="instant-purchase">Instant purchase</label>
                        </div>
                        <div class="field">
                            <input type="checkbox" id="on-demand-retail" v-model="account.reason.on_demand_retail" />
                            <label for="on-demand-retail">
                                Digital consignment / Digital fulfillment / On-demand retail
                            </label>
                        </div>
                    </div>
                    <div class="block">
                        <h2>I want to sell</h2>
                        <div class="field">
                            <input type="checkbox" id="access-b2b-net" v-model="account.reason.access_b2b_network"/>
                            <label for="access-b2b-net">Access the B2B network</label>
                        </div>
                        <div class="field">
                            <input type="checkbox" id="distribute" v-model="account.reason.distribute_on_marketplaces"/>
                            <label for="distribute">Distribute on marketplaces</label>
                        </div>
                    </div>
                </div>

                <div class="button-container">
                    <button class="success" type="submit" :disabled="!isFormValid">Create account</button>
                </div>
            </div>
        </form>
        </div>
</template>

<style>
.account-creation-page form {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    width: 100%;
}

.account-creation-page .block h2 {
    margin-bottom: 10px;
    color: var(--light-grey-0);
    font-weight: bold;
    text-align: left;
    margin-left: 0;
    border-bottom: 2px dotted #fff4;
    padding: 10px 0;
    font-family: 'Avenue_Mono';
    letter-spacing: 1px;
}

.account-creation-page .field {
    display: flex;
    gap: 10px;
    align-items: center;
    margin: 10px 0;
}

.account-creation-page .field > *:last-child {
    flex: 1;
}

.account-creation-page .container > div {
    padding-bottom: 20px;
}
.account-creation-page .block-container {
    padding-top: 20px;
    display: flex;
    justify-content: space-between;
    gap: 100px;
}

.account-creation-page .block {
    flex: 1;
}

.account-creation-page input {
    box-sizing: border-box;
    display: inline-block;
    padding: 10px;
    border-radius: 5px;
    font-size: 12pt;
    max-width: 250px;
    color: var(--light-grey-2);
}
.account-creation-page input.vti__input {
    border: none;
    background: transparent;
}

.account-creation-page label {
    display: block;
    font-weight: bold;
    margin-bottom: 5px;
    width: 160px;
}

.account-creation-page .required {
    color: var(--danger-red);
    margin-left: 5px;
}

.account-creation-page .error {
    color: var(--danger-red);
}

input.show-password-checkbox {
    border: 0;
    background: url("/icons/eye-on.svg") no-repeat center;
    background-size: cover;
    width: 20px;
    height: 20px;
    opacity: 0.5;
    position: absolute;
    display: inline-block;
    margin: 9px 0 0 -32px;
}

input.show-password-checkbox:checked {
    background: url("/icons/eye-off.svg") no-repeat center;
    background-size: cover;
}

input:has(+ input.show-password-checkbox) {
    width: 100%;
    padding-right: 40px;
}

.account-creation-page .button-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;
}

.account-creation-page button[type="submit"] {
    padding: 15px 30px;
    font-size: 18px;
}

.account-creation-page .field.certificate {
    display: grid;
    grid-template-columns: auto auto;
    grid-template-rows: auto auto;
    gap: 10px;
}

.account-creation-page .field.certificate label {
    grid-row: 1 / 1;
}

.account-creation-page .uploaded-files {
    grid-column: 2 / 2;
}

.account-creation-page .uploaded-file {
    display: flex;
    align-items: center;
    margin-top: 10px;
}

.account-creation-page .uploaded-file span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
}

.account-creation-page .uploaded-file button {
    padding: 5px 10px;
    margin-left: 10px;
}

.account-creation-page .block-container .block > h2 {
    text-transform: uppercase;
}
</style>
