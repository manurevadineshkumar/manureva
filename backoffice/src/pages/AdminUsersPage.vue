<script>
import Api from "../services/Api.js";
import DynamicListing from "../services/DynamicListing.js";
import Popup from "../components/popups/Popup.vue";
import Dropdown from "../components/dropdowns/Dropdown.vue";
import Tooltip from "../components/Tooltip.vue";
import VueGoogleAutocomplete from "vue-google-autocomplete";
import {VueTelInput} from "vue-tel-input";
import User from "../models/User.js";

export default {
    data() {
        return {
            listing: new DynamicListing(Api.listUsers),
            selectedUser: null,
            selectedUserNew: null,
            newPermissions: {},
            permissions: null,
            isEditing: false,
            vueTel: {
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
                    preferredCountries: ["FR", "US", "GB", "JP", "DE", "IT"],
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
        users() {
            return this.listing.items;
        },
    },

    async mounted() {
        const {data} = await Api.listPermissions();

        if (data.error) {
            this.$root.showToast(
                "Failed to load permissions, you will be redirected",
                {
                    type: "error",
                    duration: 4000,
                    redirect: "/forbidden",
                }
            );
        }

        this.permissions = data;

        Object.keys(this.permissions.templates).forEach((t) => {
            this.permissions.permissions.unshift({
                id: t,
                name: t.toUpperCase(),
                description: `Add all ${t} permissions to a user`,
            });
        });

        await this.listing.listBatch();
    },

    methods: {
        async openPopup(user) {
            this.isEditing = false;
            this.selectedUser = (await Api.getUserById(user.id)) ?? null;
            await this.$refs.popup.open();
        },

        async downloadCertificate(cert) {
            const blob = await Api.downloadCertificate(cert);

            if (blob.size === 0) {
                this.$root.showToast(`Certificate ${cert} not found`, {
                    type: "error",
                    duration: 5000,
                });
                return;
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        },

        toggleEditing() {
            this.selectedUserNew = new User(this.selectedUser.serialize());
            this.isEditing = !this.isEditing;
        },

        getAddressData: function (addressData, placeResultData) {
            this.selectedUserNew.addressStreet = placeResultData?.formatted_address ?? "";
            this.selectedUserNew.addressCity = addressData?.locality ?? "";
            this.selectedUserNew.addressZip = addressData?.postal_code ?? "N/A";
            this.selectedUserNew.addressCountry = addressData?.country ?? "";
        },

        updatePermissions(permissions) {
            this.newPermissions = permissions;
        },

        async saveUser() {
            const {id, ...userData} = this.selectedUserNew.serialize();
            delete userData.permissions;
            delete userData.certificates;

            const oldUserData = this.selectedUser.serialize();

            delete oldUserData.permissions;
            delete oldUserData.certificates;
            delete oldUserData.id;

            if (Object.values(userData.address).every(val => val === undefined))
                delete userData.address;

            const diff = Object.keys(userData).reduce((diff, key) => {
                if (oldUserData[key] === userData[key])
                    return diff;

                return {
                    ...diff,
                    [key]: userData[key],
                };
            }, {});

            if (diff.phone && diff.phone.length <= 4) {
                delete diff.phone;
            }

            if (Object.keys(diff).length) {
                const {data: {error}, status} = await Api.updateUser(id, diff);

                if (status !== 200) {
                    this.$root.showToast(`Failed to update user: ${error}`, {
                        type: "error",
                        duration: 5000,
                    });
                    return;
                }

                this.$root.showToast("User fields updated", {
                    type: "success",
                    duration: 5000,
                });
            }

            const setPermissions = {
                permissions: this.newPermissions.map(({id}) => id),
            };

            Object.keys(this.permissions.templates).forEach(key => {
                if (setPermissions.permissions.includes(key)) {
                    setPermissions.permissions = setPermissions.permissions
                        .filter(p => p !== key)
                        .concat(this.permissions.templates[key]);
                }
            });

            const {data: {error}} = await Api.userSetPermissions(
                id, setPermissions
            );

            if (error)
                return this.$root.showToast(
                    `Failed to update user permissions: ${error}`,
                    {
                        type: "error",
                        duration: 5000,
                    }
                );

            this.$root.showToast("User permissions updated", {
                type: "success",
                duration: 5000,
            });

            this.isEditing = false;
            this.newPermissions = {};
            this.selectedUser = (await Api.getUserById(id)) ?? null;
        },

        handleItemScroll(e) {
            this.listing.handleScroll(e);
        }
    },

    components: {
        Popup,
        Dropdown,
        VueGoogleAutocomplete,
        VueTelInput,
        Tooltip,
    },
};
</script>

<template>
    <main class="admin-user-panel">
        <div class="container shown">
            <h1 class="title">User Panel</h1>
            <div class="listing-header">
                <div class="row header">
                    <div class="col">ID</div>
                    <div class="col">Email</div>
                    <div class="col">First name</div>
                    <div class="col">Last name</div>
                    <div class="col">Company name</div>
                </div>
            </div>
            <div class="listing-items" ref="rows-container" @scroll="handleItemScroll">
                <div v-if="!listing.isLoading && !users?.length" class="empty-doodle"/>
                <div v-for="user in listing.items" class="row value" @click="openPopup(user)" :key="user?.id">
                    <div class="col">#{{ "" + user?.id }}</div>
                    <div class="col">{{ user?.email }}</div>
                    <div class="col">{{ user?.firstName }}</div>
                    <div class="col">{{ user?.lastName }}</div>
                    <div class="col">{{ user?.companyName }}</div>
                </div>
            </div>
        </div>
        <div class="popup-selected-user">
            <popup ref="popup" class="admin-user-popup">
                <div v-if="selectedUser" class="user-popup">
                    <h1>{{ selectedUser.firstName + " " + selectedUser.lastName }}</h1>
                    <div class="table-container">
                        <div class="table-right">ID:</div>
                        <div>{{ selectedUser?.id }}</div>

                        <label class="table-right">Username:</label>
                        <div v-if="!isEditing">{{ selectedUser.username }}</div>
                        <div v-else>
                            <input type="text" v-model="selectedUserNew.username" />
                        </div>

                        <label class="table-right">Email:</label>
                        <div v-if="!isEditing">
                            <a :href="'mailto:' + selectedUser?.email">{{ selectedUser?.email }}</a>
                        </div>
                        <div v-else>
                            <input type="email" v-model="selectedUserNew.email" />
                        </div>

                        <label class="table-right">Address:</label>
                        <div v-if="!isEditing">
                            <a
                                :href="'https://maps.google.com/?q=' + selectedUser?.addressStreet"
                                target="_blank"
                                rel="noopener noreferrer"
                                >{{ selectedUser?.addressStreet }}</a
                            >
                        </div>
                        <div v-else>
                            <vue-google-autocomplete
                                id="street"
                                classname="form-control"
                                placeholder="Enter the new address"
                                v-on:placechanged="getAddressData"
                                country=""
                            ></vue-google-autocomplete>
                        </div>

                        <label class="table-right">Company Name:</label>
                        <div v-if="!isEditing">
                            <a
                                v-if="selectedUser?.addressCountry === 'France'"
                                :href="'https://www.societe.com/cgi-bin/search?champs=' + selectedUser?.companyName"
                                target="_blank"
                                rel="noopener noreferrer"
                                >{{ selectedUser?.companyName }}</a
                            >
                        </div>
                        <div v-else>
                            <input type="text" v-model="selectedUserNew.companyName" />
                        </div>

                        <label class="table-right" v-if="isEditing || selectedUser.companyVat">Company VAT:</label>
                        <div v-if="!isEditing && selectedUser.companyVat">{{ selectedUser.companyVat }}</div>
                        <div v-else-if="isEditing">
                            <input type="text" v-model="selectedUserNew.companyVat" />
                        </div>

                        <label class="table-right" v-if="isEditing || selectedUser.url">URL:</label>
                        <div v-if="!isEditing && selectedUser.url">
                            <a :href="selectedUser.url" target="_blank" rel="noopener noreferrer">{{
                                selectedUser.url
                            }}</a>
                        </div>
                        <div v-else-if="isEditing">
                            <input type="url" v-model="selectedUserNew.url" />
                        </div>

                        <label class="table-right" v-if="isEditing || selectedUser.phone">Phone:</label>
                        <div v-if="!isEditing && selectedUser.phone">
                            <a :href="'tel:' + selectedUser.phone">{{ selectedUser.phone }}</a>
                        </div>
                        <div v-else-if="isEditing">
                            <vue-tel-input
                                v-if="selectedUser"
                                v-model="selectedUserNew.phone"
                                v-bind="vueTel.bindProps"
                            ></vue-tel-input>
                        </div>

                        <label class="table-right" v-if="isEditing || selectedUser.instagram">Instagram:</label>
                        <div v-if="!isEditing && selectedUser.instagram">
                            <a :href="selectedUser.instagram" target="_blank" rel="noopener noreferrer">
                                {{selectedUser.instagram}}
                            </a>
                        </div>
                        <div v-else-if="isEditing">
                            <input type="url" v-model="selectedUserNew.instagram" />
                        </div>

                        <label class="table-right" v-if="isEditing || selectedUser.tiktok">Tiktok:</label>
                        <div v-if="!isEditing && selectedUser?.tiktok">
                            <div v-if="selectedUser?.tiktok">
                                <a :href="selectedUser.tiktok" target="_blank" rel="noopener noreferrer">
                                    {{selectedUser.tiktok}}
                                </a>
                            </div>
                        </div>
                        <div v-else-if="isEditing">
                            <input type="url" v-model="selectedUserNew.tiktok" />
                        </div>

                        <label class="table-right" v-if="isEditing || selectedUser.facebook">Facebook:</label>
                        <div v-if="!isEditing && selectedUser?.facebook">
                            <div v-if="selectedUser?.facebook">
                                <a :href="selectedUser.facebook" target="_blank" rel="noopener noreferrer">
                                    {{selectedUser.facebook}}
                                </a>
                            </div>
                        </div>
                        <div v-else-if="isEditing">
                            <input type="url" v-model="selectedUserNew.facebook" />
                        </div>

                        <label class="table-right" v-if="isEditing || selectedUser.linkedin">Linkedin:</label>
                        <div v-if="!isEditing && selectedUser?.linkedin">
                            <div>
                                <a :href="selectedUser.linkedin" target="_blank" rel="noopener noreferrer">
                                    {{selectedUser.linkedin}}
                                </a>
                            </div>
                        </div>
                        <div v-else-if="isEditing">
                            <input type="url" v-model="selectedUserNew.linkedin" />
                        </div>

                        <label class="table-right">Permissions:</label>
                        <div v-if="!isEditing">
                            <div class="item-tags">
                                <div class="permission-tag" v-for="perm in selectedUser?.permissions.data">
                                    <button class="button-tag" type="button">
                                        {{ perm }}
                                    </button>
                                    <Tooltip :text="
                                        Object.values(this.permissions.permissions)
                                            .find(p => p.name === perm).description"
                                    />
                                </div>
                            </div>
                        </div>
                        <div v-else>
                            <dropdown
                                is-multiple
                                :values="
                                    this.permissions.permissions
                                        .filter(({name}) => this.selectedUserNew.permissions.data.has(name))
                                        .map(({id}) => id)
                                "
                                :items="this.permissions.permissions"
                                @change="p => updatePermissions(p)"
                            >Modify permissions...</dropdown>
                        </div>

                        <div class="table-right" v-if="selectedUser?.certificates.length">Certificates:</div>
                        <div v-if="selectedUser?.certificates.length" class="item-tags">
                            <div v-for="cert in selectedUser?.certificates" class="certificate-tag">
                                <button class="button-tag" type="button" @click="downloadCertificate(cert)">
                                    {{ cert }}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="button-container">
                        <button
                            v-if="isEditing"
                            class="cancel-button"
                            type="button"
                            @click="toggleEditing"
                        >Cancel</button>
                        <button v-else class="edit-button" type="button" @click="toggleEditing">Edit</button>
                        <button class="success" v-if="isEditing" type="button" @click="saveUser">Save</button>
                        <button
                            v-if="!isEditing"
                            class="success"
                            type="button"
                            @click="() => $root.openUserCart(this.selectedUser)"
                        >Open Cart</button>
                    </div>
                </div>
            </popup>
        </div>
    </main>
</template>

<style>
.admin-user-panel {
    width: 100%;
    background-color: var(--white-color);
}

.admin-user-panel .listing-items {
    max-height: 90vh;
}

.admin-user-panel .title {
    margin: 30px;
}
.admin-user-panel .admin-user-popup {
    max-width: 800px;
    min-width: 600px;
    min-height: 300px;
    background-color: var(--black-grey);
}

.admin-user-panel .user-popup {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 10px;
    font-size: 14pt;
}

.admin-user-panel .user-popup > h1 {
    font-size: 20pt;
    font-weight: bold;
    margin: 0;
    grid-column: 1 / -1;
    text-align: center;
}

.admin-user-panel .table-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 10px;
}

.admin-user-panel .table-right {
    font-weight: bold;
}

.admin-user-panel .fields {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.admin-user-panel .row.value {
    padding: 15px;
    border-bottom: 1px solid var(--see-through-black-1);
    cursor: pointer;
}

.admin-user-panel .row.value:hover {
    background-color: var(--white-grey);
    padding: 18px 15px 18px 18px;
}

.admin-user-panel .item-tag {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: flex-end;
}

.admin-user-panel .button-tag {
    white-space: nowrap;
    cursor: pointer;
}

.admin-user-panel .button-tag:hover {
    background-color: #fff3;
}

.admin-user-panel .permission-tag {
    position: relative;
    display: inline-block;
}

.admin-user-panel .cancel-button {
    margin-right: auto;
}
.admin-user-panel .edit-button {
    --color: var(--bright-orange);
}

.admin-user-panel .button-container {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
}

.admin-user-panel .dropdown {
    flex: 1;
    width: 100%;
    height: 40px;
    color: var(--light-grey-2);
    font-size: 14pt;
}

/* Responsive Styles */

@media only screen and (max-width: 600px) {
    .admin-user-panel .listing-header > .row,
    .listing-items > .row {
        justify-content: flex-start;
        align-items: flex-start;
    }

    .admin-user-panel .admin-user-popup {
        min-width: auto;
    }

    .admin-user-panel .table-container {
        grid-template-columns: 1fr;
    }
}
</style>
