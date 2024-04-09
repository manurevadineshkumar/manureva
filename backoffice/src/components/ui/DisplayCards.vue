<script>

export default {

    props: {
        collections: {
            type: Array,
            required: true
        },
        mobileBreakpoint: {
            type: Object,
            required: true
        }
    },

    methods: {
        changeActiveCollection(e) {
            this.collections.forEach(collection => collection.active = false);
            const selectedCollection = this.collections
                .find(collection => collection.name === e.target.innerText.toLowerCase());
            selectedCollection.active = true;
        }
    },

};
</script>

<template>
    <v-sheet class="cards-group">
        <v-slide-group class="w-75">
            <v-row class="collection" no-gutters>
                <v-slide-group-item v-for="collection of collections">
                    <h3 :class="'collection-title' + [collection.active ? ' active' : '']"
                        @click="changeActiveCollection">{{ collection.name.toUpperCase() }}</h3>
                </v-slide-group-item>
            </v-row>
        </v-slide-group>
        <v-slide-group show-arrows class="cards-slide-group">
            <template v-for="collection of collections">
                <v-row justify="center" v-if="collection.active" no-gutters>
                    <v-slide-group-item
                        v-for="(item, index) of collection.selection"
                        :key="index"
                    >
                    <v-scale-transition>
                        <v-card class="card ma-2"
                        :height="mobileBreakpoint.smAndUp ? '350px' : '250px'"
                        :width="mobileBreakpoint.smAndUp ? '250px' : '200px'">
                            <v-img :src="item.image" height="200px" contain></v-img>
                            <v-card-title class="card-title"
                                v-if="collection.active">{{ item.brand ?? item.name }}</v-card-title>
                            </v-card>
                        </v-scale-transition>
                    </v-slide-group-item>
                </v-row>
            </template>
        </v-slide-group>
    </v-sheet>
</template>

<style>

.cards-group {
    display: flex;
    align-items: center;
    flex-direction: column;
    flex-wrap: nowrap;
    gap: 20px;
    justify-content: center;
    z-index: 3;
    width: 80%;
}

.cards-group .collection {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 20px;
}

.cards-group .collection .collection-title {
    font-weight: normal;
    cursor: pointer;
}

.cards-group .collection .collection-title:hover {
    text-decoration: underline;
}

.cards-group .collection .collection-title.active {
    text-decoration: underline;
}

.cards-group .cards-slide-group {
    width: 100%;
}

.cards-group .card {
    border-radius: 10px;
    background: var(--white-color);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border: 1px solid var(--light-grey-0);
}

.cards-group .card .card-title {
    border-top: 1px solid var(--light-grey-0);
    text-transform: uppercase;
    font-size: 0.8rem;
    font-family: 'Avenue_Mono';
}

@media only screen and (max-width: 620px) {

    .cards-group .collection .collection {
        padding: 0px 15px;
    }

    .cards-group {
        gap: 10px;
    }

}

</style>
