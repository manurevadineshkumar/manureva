<script>
import Api from "../../services/Api.js";

import Popup from "./Popup.vue";
import Dropdown from "../dropdowns/Dropdown.vue";

export default {
    data() {
        return {
            order: null,
            orderDetails: null,
            document: null,
            status: null,
            comment: null,
        };
    },

    methods: {
        /**
         * If order is null, close the popup
         * Check if the user has the permission to read the order details.
         * If yes, call the API to get the order details.
         * Open the popup
         * @param {Object} order
         */
        async openOrder(order) {
            if (!order) {
                void this.$refs.popup.close();
                this.order = null;
                return;
            }

            this.order = order;
            if (this.user.permissions.has("SALES_CHANNEL_READ_DETAILS"))
                this.orderDetails = (await Api.getChannelById({
                    id: this.order.channel_id
                })).data;
            if (this.user.permissions.has("READ_ORDER_DETAILS"))
                this.comment = this.order.comment;

            void this.$refs.popup.open();
        },

        /**
         * Create a FormData object with the document file
         * Call the API to update the order document
         * If there is an error, display it
         * @returns {Promise<void>}
         */
        async updateDocument() {
            const form_data = new FormData();
            form_data.append("file", this.document[0]);

            const {data: {error}} = await Api.putDocumentOrder({
                order_id: this.order.id,
                document: form_data,
            });
            if (error)
                alert(error.message);
        },

        /**
         * If the user has upload a document, call the API to update it
         * If the user has commented, call the API to update it
         * If the user has changed the status, call the API to update it
         */
        async updateOrder() {
            const data = {};

            if (this.document) {
                const file = this.document[0];
                const allowed_extensions = ["pdf", "png", "jpg", "jpeg"];
                const extension = file.name.split(".").pop().toLowerCase();

                if (!allowed_extensions.includes(extension))
                    return alert(
                        "Invalid file extension, please use " +
                        allowed_extensions.join(", ")
                    );

                await this.updateDocument();
            }

            if (this.user.permissions.has("ADMIN")) {
                if (this.comment !== this.order.comment && this.comment !== null)
                    data.comment_admin = this.comment;
                if (this.order.status !== this.status)
                    data.status = this.status;
            } else {
                if (this.comment !== this.order.comment && this.comment !== null)
                    data.comment_user = this.comment;
            }

            if (data.status === null)
                delete data.status;

            if (Object.keys(data).length !== 0)
                await Api.updateOrder({
                    order_id: +this.order.id,
                    data,
                });

            this.$emit("reload");

            void this.$refs.popup.close();
        },

        /**
         * Call the API to download the order file
         * If the file header is not a pdf or an image, display an error
         * Create a link to download the file
         * Add the link to the body
         * Click on the link
         * Remove the link from the body
         * Revoke the object URL
         * @returns {Promise<void>}
         */
        async downloadFile() {
            const blob = await Api.getOrderFile({order_id: this.order.id});
            if (blob.type !== "application/pdf" && !blob.type.startsWith("image/"))
                return alert("File not found");

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");

            a.href = url;
            a.download = `Order #${this.order.id.toString().padStart(8, "0")}.`
                + blob.type.split("/")[1];
            a.click();
            window.URL.revokeObjectURL(url);
        },
    },

    components: {
        Popup,
        Dropdown,
    },
};
</script>
<template>
    <popup ref="popup" class="order-popup">
        <h1>Order ID #{{ order?.id?.toString().padStart(8, "0") }}</h1>
        <div class="order-details">
            <table>
                <tbody>
                    <tr>
                        <th>Product ID:</th>
                        <td>{{ order?.product_id }}</td>
                    </tr>
                    <tr v-if="user.permissions.has('SALES_CHANNEL_READ_DETAILS')">
                        <th>Ordered from:</th>
                        <td>{{ orderDetails?.name }}</td>
                    </tr>
                    <tr v-if="user.permissions.has('SALES_CHANNEL_READ_DETAILS')">
                        <th>Ratio:</th>
                        <td>{{ orderDetails?.ratio }}x</td>
                    </tr>
                    <tr v-if="user.permissions.has('SALES_CHANNEL_READ_DETAILS')">
                        <th>Type:</th>
                        <td>{{ orderDetails?.type }}</td>
                    </tr>
                    <tr>
                        <th>Status:</th>
                        <dropdown
                            v-if="user.permissions.has('ADMIN')"
                            :items="[
                                {id: 'PENDING', name: 'Pending'},
                                {id: 'RECEIVED', name: 'Received'},
                                {id: 'DELIVERED', name: 'Delivered'},
                                {id: 'REFUNDED', name: 'Refunded'},
                                {id: 'WAITING_FOR_PAYMENT', name: 'Waiting for payment'},
                                {id: 'COMPLETED', name: 'Completed'},
                            ]"
                            @change="([{id}]) => (status = id)"
                            >{{ order?.status }}</dropdown
                        >
                        <td v-else> {{ order?.status }}</td>
                    </tr>
                </tbody>
            </table>
            <div class="document-input" v-if="user.permissions.has('READ_ORDER_DETAILS')">
                <span><strong>Document</strong></span>
                <input
                    v-if="user.permissions.has('UPDATE_ORDER_DETAILS')"
                    type="file"
                    accept="application/pdf, image/*"
                    @change="(e) => (this.document = e.target.files)" />
                <button class="black" @click="downloadFile">Download</button>
            </div>
            <div class="comment-input" v-if="user.permissions.has('READ_ORDER_DETAILS')">
                <span><strong>Comment</strong></span>
                <textarea
                    spellcheck="false"
                    :readonly="!user.permissions.has('UPDATE_ORDER_DETAILS')"
                    v-model="comment"
                />
            </div>
        </div>
        <div class="order-popup-actions">
            <button class="danger" @click="$refs.popup.close">Close</button>
            <button
                class="success"
                v-if="user.permissions.has('UPDATE_ORDER_DETAILS')"
                @click="updateOrder">Save
            </button>
        </div>
    </popup>
</template>

<style>
.order-popup {
    margin-top: 15vh;
    min-width: 400px;
}

.order-popup > h1 {
    margin-bottom: 15px;
    text-align: center;
}

.order-details {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}

.order-details table {
    margin: 0 auto;
    border-collapse: collapse;
}

.order-details th,
.order-details td {
    padding: 10px;
    text-align: left;
}

.order-details th {
    white-space: nowrap;
}

.document-input {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 10px;
    gap: 15px;
}

.document-input input[type="file"] {
    cursor: pointer;
    border-radius: 10px;
    width: auto;
    height: 42px;
}

.comment-input {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 10px 0 10px 0;
}

.comment-input textarea {
    word-wrap: break-word;
    word-break: break-all;
    height: 160px;
    border: 1px solid var(--light-grey-1);
    color: var(--black-grey);
}

.comment-input textarea:focus {
    outline: none;
}

.order-popup-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
</style>
