<script>
import Api from "../../services/Api.js";

import DynamicListing from "../../services/DynamicListing";

import LogProductsPopup from "./LogProductsPopup.vue";
import Popup from "./Popup.vue";

export default {
    data() {
        return {
            session: null,
            modules: null,
        };
    },

    methods: {
        /**
         * Call the API to get information on the log session with the id.
         * Open the log session popup.
         * @param {Object} session - The log session to open.
         * @returns {Promise<void>}
         */
        async open(session) {
            this.session = session;
            this.modules = new DynamicListing(({prev_id, batch_size}) =>
                Api.getLogSessionById({
                    id: this.session.id, prev_id, batch_size
                })
            );
            await this.modules.listBatch();
            await this.$refs.popup.open();
        },

        /**
         * Close the log session popup.
         * @returns {Promise<void>}
         */
        async closePopup() {
            await this.$refs.popup.close();
        },

        /**
         * Open the log products popup.
         * @param {Object} session - The log session to open.
         * @returns {Promise<void>}
         */
        async openSessionProducts(session) {
            await this.$refs["log-module-popup"].open(session);
        },

        /**
         * Download the log file when user clicks on the download button.
         * It calls the API to get the log module file.
         * Create a link to download the file.
         * Click on the link to download the file.
         * Remove the link.
         * Revoke the URL.
         * @param {Object} logModule - The log module to download.
         */
        async downloadFile(logModule) {
            const blob = await Api.getFileModule({id: logModule.id});
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");

            a.href = url;
            a.download = `module-${logModule.name}.log`;

            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        },
    },

    components: {
        Popup,
        LogProductsPopup,
    },
};
</script>

<template>
    <popup ref="popup" class="sessions-log-popup">
        <log-products-popup ref="log-module-popup"></log-products-popup>
        <div class="sessions-info" @scroll="modules.handleScroll">
            <div v-for="logModule in modules?.products" class="session-card">
                <h1 v-on:click="test">{{ logModule?.name }}</h1>
                <table>
                    <tbody>
                        <tr>
                            <th>Start time:</th>
                            <td class="format-time">{{ new Date(logModule?.start_time).toLocaleString() }}</td>
                        </tr>
                        <tr>
                            <th>End time:</th>
                            <td class="format-time">{{ new Date(logModule?.end_time).toLocaleString() }}</td>
                        </tr>
                        <tr>
                            <th>Total:</th>
                            <td>{{ logModule.total_count }}</td>
                        </tr>
                        <tr>
                            <th>Failed:</th>
                            <td>{{ logModule.fail_count }}</td>
                        </tr>
                    </tbody>
                </table>
                <button class="download-button" @click="downloadFile(logModule)">Download Log</button>
            </div>
        </div>
        <div class="sessions-action">
            <button @click="closePopup">Close</button>
            <button class="blue" @click="openSessionProducts(session)">Show Products</button>
        </div>
    </popup>
</template>

<style>
.sessions-log-popup {
    top: 20%;
    display: flex;
    flex-direction: column;
    overflow: auto;
    max-height: calc(100% - 80px);
}
.sessions-log-popup .sessions-info {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 25px;
    overflow: auto;
    padding: 28px;
    max-width: 1060px;
    border-bottom: 1px solid #444;
}

.sessions-log-popup .sessions-info h1 {
    display: flex;
    justify-content: center;
}

.sessions-log-popup .session-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: var(--grey);
    border-radius: 10px;
    padding: 20px;
    width: 300px;
}

.session-card .format-time {
    font-size: 14px;
}

.sessions-log-popup .sessions-action {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding-top: 15px;
    width: 100%;
}

.sessions-log-popup .download-button {
    margin-top: 10px;
    font-size: 15px;
    padding: 5px 30px;
}
</style>
