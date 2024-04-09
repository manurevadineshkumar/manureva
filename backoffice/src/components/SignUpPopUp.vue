<script>
import Api from "../services/Api";
/**
 * Component in progress => still need to get the data from the form and send everything on slack
 *
 * To make this component work, you need to add a v-dialog to the parent element and nest this component inside
 * Also remember to add the activator slot and the dialog = false to the data of the parent element
 *
 * Example:
*       <v-dialog v-model="dialog" max-width="600">
            <template v-slot:activator="{ props: activatorProps }">
                <button v-bind="activatorProps" class="black w-50">Sign up here</button>
            </template>
            <SignUpPopUp :dialog="dialog" @update-dialog="() => dialog = !dialog"/>
        </v-dialog>
*/

export default {
    props: {
        dialog: {
            type: Boolean,
            required: true
        }
    },

    emits: ["update-dialog"],

    data() {
        return {
            firstName: '',
            lastName: '',
            email: '',
            company: ''
        };
    },
    computed: {
        isFormValid() {
            return (
                this.firstName && 
                this.lastName &&
                this.email &&
                this.company
                );

        },
    },

    methods: {
        /**
         * Collect form data
         */
         async SingUpLink() {
            const formData = {
                firstName: this.firstName,
                lastName: this.lastName,
                email: this.email,
                company: this.company
            };

            const {data: {error}} = await Api.createSingupLink(formData);

            if (error) {
                this.$root.showToast(`Error: ${error}`, {
                    type: "error",
                    duration: 5000,
                });
                return;
            }
            this.$root.showToast("Account created successfully!", {
            type: "success",
            duration: 5000,
            });
        }
    }
};
</script>

<template>
    <v-card class="d-flex flex-column ga-4 pa-4">
        <v-card-title class="text-center"><h2>SIGN UP</h2></v-card-title>
        <v-card-text class="text-center">
            Enter your email address to receive a sign up link and create your account
        </v-card-text>
        <v-card-text class="d-flex flex-column ga-4">
            <v-row dense>
                <v-col cols="12" sm="6">
                    <v-text-field label="First name"></v-text-field>
                </v-col>

                <v-col cols="12" sm="6">
                    <v-text-field label="Last name"></v-text-field>
                </v-col>
            </v-row>
            <v-row dense>
                <v-text-field label="Email*" required></v-text-field>
            </v-row>
            <v-row dense>
                <v-text-field label="Company*" required></v-text-field>
            </v-row>
            <small class="text-caption font-italic">*required fields</small>
        </v-card-text>

        <v-card-actions class="ga-4">
            <v-spacer></v-spacer>
            <button class="black" @click="$emit('update-dialog')">CLOSE</button>
            <button class="black" @click="SingUpLink">SUBMIT</button>
        </v-card-actions>
    </v-card>
</template>

<style>
.v-dialog .v-card {
    background-color: var(--white-color);
}

.v-field__field {
    background-color: var(--white-color);
}
</style>
