<script>
import Api from "../services/Api.js";
import DynamicListing from "../services/DynamicListing.js";

import ProductsList from "../components/ProductsList.vue";
import ProductPopup from "../components/popups/ProductPopup.vue";

import TooltipText from "../components/ui/TooltipText.vue";

export default {
    data() {
        return {
            listing: new DynamicListing(
                Api.listTags,
                {transformer_fn: data => ({...data, initialName: data.name})}
            ),
            newTagName: "",
            selectedTag: null
        };
    },

    mounted() {
        void this.listing.listBatch();
    },

    methods: {
        async addTag(e) {
            e.preventDefault();

            const {data: {error}} = await Api.createTag({
                name: this.newTagName
            });

            if (error)
                return window.alert("Error: " + error);

            this.newTagName = "";

            await this.listing.listBatch({force: true});
        },

        async editTagName(tag) {
            const {data: {error}} = await Api.editTag(tag);

            if (error) {
                tag.name = tag.initialName;
                return window.alert("Error: " + error);
            }

            tag.initialName = tag.name;

            document.activeElement.blur();
        },

        async openTagCsv(tag) {
            const url = `${Api.BASE_URL}/tags/${tag.id}/csv`
                + `?token=${encodeURIComponent(tag.products_group.share_token)}`;

            await navigator.clipboard.writeText(url);

            alert("Tag URL copied to clipboard");
        },

        async shareView(tag) {
            const url = Api.getShareViewUrl(tag.products_group);

            await navigator.clipboard.writeText(url);

            this.$root.showToast("Share View URL copied to clipboard", {
                type: "info",
                duration: 2300,
            });
        },

        async deleteTag(tag) {
            if (
                !confirm(
                    `Unassign tag "${tag.name}" from all products `
                    + "and delete it?"
                )
            )
                return;

            const {data: {error}} = await Api.deleteTag(tag);

            if (error)
                alert("Error: " + error);

            this.selectedTag = null;
            await this.listing.listBatch({reset: true});
        }
    },

    components: {
        ProductPopup,
        ProductsList,
        TooltipText,
    }
};
</script>

<template>
    <product-popup
        ref="product-popup"
        @save="$refs['products-list'].reloadProducts()"
    />
    <main class="page tags-page">
        <section class="page-section">
            <header class="section-header">
                <h1>TAGS</h1>
            </header>
            <form class="tag new" @submit="addTag">
                <input v-model="newTagName" required maxlength="64" placeholder="Add new tag...">
                <button class="inline-input-button" type="submit" title="(Enter)">Add</button>
            </form>
            <div class="listing-header">
                <div class="row header">
                    <span class="col actions-col">Actions</span>
                    <span class="col">Name</span>
                    <span class="col small">Products</span>
                </div>
            </div>
            <div class="listing-items" ref="tags-container" @scroll="listing.handleScroll">
                <div v-for="tag in listing.items" class="row tag">
                    <div class="col actions-col">
                        <template v-if="tag.is_system">
                            <button type="button" @click="() => shareView(tag)" class="mini-button action-share-view"/>
                            <button type="button" disabled class="mini-button action-wrench"/>
                        </template>
                        <template v-else>
                            <button type="button" @click="() => shareView(tag)" class="mini-button action-share-view">
                                <TooltipText
                                    text="Share selection link"
                                    location="bottom"
                                />
                            </button>
                            <button type="button" @click="() => openTagCsv(tag)" class="mini-button action-csv">
                                <TooltipText
                                    text="Export to csv"
                                    location="bottom"
                                />
                            </button>
                            <button type="button" @click="() => deleteTag(tag)" class="mini-button action-delete"/>
                        </template>
                    </div>
                    <form class="col" @submit.prevent="editTagName(tag)">
                        <input
                            class="tag-name-input"
                            ref="name-input"
                            v-model="tag.name"
                            @blur="() => { tag.name = tag.initialName; }"
                        >
                    </form>
                    <span class="col small">{{ tag.products_group.products_count }}</span>
                </div>
            </div>
        </section>
    </main>
</template>

<style>
main.tags-page {
    perspective: 6000px;
}

.tags-page .tag.new {
    margin-bottom: 20px;
}

.listing-header > .row.header {
    color: var(--mid-grey);
}

.tags-page .tag {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 10px;
    gap: 10px;
}
.tags-page .tag.new {
    padding: 10px 0 0 0;
}
.tags-page .tag.new > input {
    display: inline-block;
    width: 100%;
    padding-right: 75px;
}

.tags-page .tag form {
    width: 100%;
    box-sizing: border-box;
    background: none;
}
.tags-page .tag form > input {
    width: 100%;
    background: none;
    border-radius: 0px;
    border-bottom: solid var(--see-through-grey) 1px;
}
.tags-page .tag form > input:hover {
    background: var(--see-through-grey);
    border-radius: 5px;
}
.tags-page .tag form > input:focus {
    background: var(--see-through-black-1);
}
.tags-page .header span{
    padding-right: 20px;
}

.tags-page .tag span {
    padding: 0 25px;
}
.tags-page .col.actions-col {
    min-width: 110px;
}

@media only screen and (max-width: 600px) {
    .tags-page .col.actions-col {
        min-width:  80px;
        display: flex;
        flex-wrap: wrap;
    }
}
</style>
