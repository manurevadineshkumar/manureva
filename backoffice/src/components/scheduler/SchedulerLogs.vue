<script>
import Api from "../../services/Api.js";

import DynamicListing from "../../services/DynamicListing";

import LogSessionPopup from "../popups/LogSessionPopup.vue";

export default {
    props: {
        title: {
            type: String,
            default: "",
        },
    },

    data() {
        return {
            statistics: null,
            sessionsListing: new DynamicListing(({prev_id, batch_size}) =>
                Api.getLogSessions({prev_id, batch_size})
            ),
        };
    },

    async beforeMount() {
        await this.sessionsListing.listBatch();
    },

    methods: {
        /**
         * Open the log session popup.
         * @param {Object} session - The log session to open.
         */
        openSession(session) {
            this.$refs["module-logs-popup"].open(session);
        },
    },

    components: {
        LogSessionPopup,
    },
};
</script>

<template>
    <div class="logger">
        <log-session-popup ref="module-logs-popup"></log-session-popup>
        <div class="row-listing-container">
            <div class="listing-header">
                <div class="row header">
                    <div class="col">ID</div>
                    <div class="col">Name</div>
                    <div class="col">Created</div>
                    <div class="col">Updated</div>
                    <div class="col">Deleted</div>
                    <div class="col">Start Time</div>
                    <div class="col">End Time</div>
                </div>
            </div>
            <div class="listing-items" @scroll="sessionsListing.handleScroll">
                <div
                    v-for="session in sessionsListing.items"
                    class="row anim"
                    @click="openSession(session)"
                    :key="session.id">
                    <div class="col">{{ session.id }}</div>
                    <div class="col format-uuid">{{ session.name }}</div>
                    <div class="col">{{ session.created_products }}</div>
                    <div class="col">{{ session.updated_products }}</div>
                    <div class="col">{{ session.deleted_products }}</div>
                    <div class="col">{{ new Date(session.start_time).toLocaleString("en-GB") }}</div>
                    <div class="col">{{ new Date(session.end_time).toLocaleString("en-GB") }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
.logger {
    flex: 1;
    display: flex;
    gap: 25px;
    flex-wrap: wrap;
    max-height: 460px;
}

.logger .format-uuid {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.logger .listing-items {
    max-height: 380px;
    overflow-y: scroll;
}

.logger .row.anim {
    padding: 15px 12px 15px 15px;
}

.logger .row.anim:hover {
    padding: 18px 15px 18px 18px;
}
</style>
