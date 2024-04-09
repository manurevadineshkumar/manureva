<script>

import PageSection from "../components/ui/PageSection.vue";
import DisplayCards from "../components/ui/DisplayCards.vue";
import SignUpPopUp from "../components/SignUpPopUp.vue";
import Api from "../services/Api";
import {useDisplay} from "vuetify";

const RECLO_IMAGE_LINK = "https://d1pq8lc7tc3eo0.cloudfront.net/img/upload/item_images";
const OPULENCE_IMAGE_LINK = "https://seek-unique-co.s3.amazonaws.com/e19163bd-aaac-41d6-b2c6-6d6a89f89f52/stock";

export default {
    data() {
        return {
            mobileBreakpoint: useDisplay(),
            collections: [
                {name: "classics", id: 89, selection: [], active: true},
                {name: "vintage", id: 74, selection: [], active: false},
                {name: "timeless chanel", id: 63, selection: [], active: false},
                {name: "monogram", id: 78, selection: [], active: false},
                {name: "black bags", id: 75, selection: [], active: false},
            ],
            productFilters: [
                {name: "brands", color: "red", selection: [
                    {
                        image: `${RECLO_IMAGE_LINK}/3538241/881960_zoom.jpg`,
                        brand: "Chanel"
                    },
                    {
                        image: `${RECLO_IMAGE_LINK}/3385980/848784_zoom.jpg`,
                        brand: "Bottega Venetta"
                    },
                    {
                        image: `${RECLO_IMAGE_LINK}/3517795/878318_zoom.jpg`,
                        brand: "Celine"
                    },
                    {
                        image: `${RECLO_IMAGE_LINK}/3492924/872700_zoom.jpg`,
                        brand: "Dior"
                    },
                    {
                        image: `${RECLO_IMAGE_LINK}/3542904/883029_zoom.jpg`,
                        brand: "Fendi"
                    }], active: true},
                {name: "categories", color: "green", selection: [
                    {
                        image: `${RECLO_IMAGE_LINK}/3507882/875656_zoom.jpg`,
                        name: "Bags"
                    },
                    {
                        image: `${RECLO_IMAGE_LINK}/3376213/850168_zoom.jpg`,
                        name: "Shoes"
                    },
                    {
                        image: `${RECLO_IMAGE_LINK}/3418441/857893_zoom.jpg`,
                        name: "Small Goods"
                    },
                    {
                        image: `${RECLO_IMAGE_LINK}/3536295/881362_zoom.jpg`,
                        name: "Clothing"
                    },
                    {
                        image: `${RECLO_IMAGE_LINK}/3543516/883470_zoom.jpg`,
                        name: "Watches & Jewellery"
                    }], active: false},
                {name: "models", color: null, selection: [
                    {
                        image: `${RECLO_IMAGE_LINK}/3512123/877654_zoom.jpg`,
                        brand: "Fendi - Baguette"
                    },
                    {
                        image: `${RECLO_IMAGE_LINK}/3501888/873758_zoom.jpg`,
                        brand: "Evelyne - Hermes"
                    },
                    {
                        image: `${RECLO_IMAGE_LINK}/3533632/881035_zoom.jpg`,
                        brand: "Chanel - Timeless"
                    },
                    {
                        image: `${OPULENCE_IMAGE_LINK}/65cb5cb001625_538_7716.jpg`,
                        brand: "Jackie - Gucci"
                    },
                    {
                        image: `${RECLO_IMAGE_LINK}/3267280/830778_zoom.jpg`,
                        brand: "Baggy - Louis Vuitton"
                    }], active: false},
                {name: "prices", color: "blue", selection: [], active: false},
                {name: "grades", color: "orange", selection: [], active: false}
            ],
            positionWholesale: {
                top: 0,
                left: 0,
                height: 0,
                width: 0
            },
            positionDropshipping: {
                top: 0,
                left: 0,
                height: 0,
                width: 0
            },
            positionFilter: {
                top: 0,
                left: 0,
                height: 0,
                width: 0
            },
            positionServices: {
                top: 0,
                left: 0,
                height: 0,
                width: 0
            },
            positionFooter: {
                top: 0,
                left: 0,
                height: 0,
                width: 0
            },
            dialog: false,
        };
    },

    methods: {

        getOffset(element) {
            const bodyRect = document.body.getBoundingClientRect();
            const elemRect = element.getBoundingClientRect();

            return {
                top: elemRect.top - bodyRect.top,
                left: elemRect.left - bodyRect.left,
                height: elemRect.height,
                width: elemRect.width
            };
        },

        getWholesalePosition() {
            const pos = this.getOffset(this.$refs.positionWholesale);
            this.positionWholesale.top = pos.top;
            this.positionWholesale.left = pos.left;
            this.positionWholesale.height = pos.height;
            this.positionWholesale.width = pos.width;
        },

        getDropshippingPosition() {
            const pos = this.getOffset(this.$refs.positionDropshipping);
            this.positionDropshipping.top = pos.top;
            this.positionDropshipping.left = pos.left;
            this.positionDropshipping.height = pos.height;
            this.positionDropshipping.width = pos.width;;
        },

        getFilterPosition() {
            const pos = this.getOffset(this.$refs.positionFilter);
            this.positionFilter.top = pos.top;
            this.positionFilter.left = pos.left;
            this.positionFilter.height = pos.height;
            this.positionFilter.width = pos.width;
        },

        getServicesPosition() {
            const pos = this.getOffset(this.$refs.positionServices);
            this.positionServices.top = pos.top;
            this.positionServices.left = pos.left;
            this.positionServices.height = pos.height;
            this.positionServices.width = pos.width;
        },

        getFooterPosition() {
            const pos = this.getOffset(this.$refs.positionFooter);
            this.positionFooter.top = pos.top;
            this.positionFooter.left = pos.left;
            this.positionFooter.height = pos.height;
            this.positionFooter.width = pos.width;
        },

        calculatePositions() {
            if (this.mobileBreakpoint.width > 620) {
                this.getWholesalePosition();
                this.getDropshippingPosition();
                this.getFilterPosition();
                this.getServicesPosition();
                this.getFooterPosition();
            }
        }
    },

    async mounted() {

        this.calculatePositions();
        window.addEventListener("scroll", () => this.calculatePositions());
        window.removeEventListener("scroll", () => this.calculatePositions());
        window.addEventListener("resize", () => this.calculatePositions());

        try {
            const products = this.collections.map((collection) => {
                return Api.getProductsFromCollectionsTags(collection.id, 0, 10);
            });
            const collections = await Promise.all(products);
            collections.forEach((collection, index) => {
                this.collections[index].selection = collection.data;
            });
        } catch (e) {
            console.error(`Error while fetching Collection Tags : ${e}`);
        }
    },

    beforeDestroy() {
        window.removeEventListener("resize", this.calculatePositions);
    },

    computed: {
        filteredFilters() {
            return this.productFilters.filter(filter => filter.selection.length > 0);
        }
    },

    components: {
        PageSection,
        DisplayCards,
        SignUpPopUp,
    },
};
</script>

<template>
    <v-main class="page welcome-page">
        <v-container fluid class="container d-flex flex-column pa-0">
            <v-parallax src="/img/welcome-page/bags.JPG"
                heigh="100vh" width="100%" style="mix-blend-mode: hard-light; padding: 0px;">
                <v-row class="h-screen">
                    <div class="title d-flex align-center justify-center">
                        <h1 :class="[mobileBreakpoint.mdAndDown ? 'w-100' : 'w-50']">
                            Empowering wholesale future: a tech driven,
                            risk-free solution for the next-gen of online retailers
                        </h1>
                    </div>
                </v-row>
            </v-parallax>
            <v-row class="company-description d-flex flex-column align-center justify-space-evenly">
                <v-row class="company-description-text d-flex flex-column align-center justify-center ga-5">
                    <h2>Sourcing - Technology {{mobileBreakpoint.width < 398 ? '&#160' : '-'}} Logistics</h2>
                    <h3 class="w-75">
                        Adapted to new players of retail, our solutions enables all types of retailers
                        to find a large quantity of unique and rare products at good prices or in consignement.
                        Korvin is the exclusive partners of players who wants to rethink the supply chain of stores,
                        using the technology and respectfully of our values.
                    </h3>
                </v-row>
                <DisplayCards :collections="collections" :mobileBreakpoint="mobileBreakpoint"/>
            </v-row>
            <v-row class="business">
                <h2>UNIQUE BUYING SOLUTIONS</h2>
                <v-row>
                    <div ref="positionWholesale"
                        :class="'wholesale ' + [mobileBreakpoint.smAndDown ? 'pl-0' : 'pl-16']">
                        <h2>WHOLESALE ECOMMERCE</h2>
                        <h3>
                            With Korvin Wholesale e-commerce, we respect the rules of B2B buyings.
                            Add as many items as you want to you cart, checkout online with a variety
                            of payments methods and receive your items certified within a week directly to your store.
                        </h3>
                    </div>
                </v-row>
                <v-row>
                    <div ref="positionDropshipping" class="dropshipping">
                        <h2>DROPSHIPPING SUPPLY</h2>
                        <h3>
                            Unlock the potential of online sales with our dropshipping technology. In a few seconds,
                            find supply for your online store and adopt a new risk free way to increase the number
                            of pieces available on your website.
                        </h3>
                    </div>
                </v-row>
            </v-row>
            <v-row class="catalog-filter d-flex align-center justify-center ga-12">
                <v-row class="filter d-flex flex-column align-center justify-center ga-12">
                    <h2 ref="positionFilter">Browse among our +10.000 pieces catalog of variety of </h2>
                    <v-row class="d-flex justify-center align-center">
                        <template v-for="filter of productFilters">
                            <template v-if="filter.color">
                                <button :id="filter.color">{{ filter.name.toLowerCase() }}</button>
                            </template>
                        </template>
                    </v-row>
                </v-row>
                <DisplayCards :collections="filteredFilters" :mobileBreakpoint="mobileBreakpoint"/>
            </v-row>
            <v-row class="service-footer">
                <v-row :class="'d-flex flex-column ' + [mobileBreakpoint.smAndDown ? 'w-75 ma-auto ga-12' : 'ga-5']">
                    <h2 class="text-center px-3 mb-5" ref="positionServices">
                        A variety of third services to enhance the luxury buying experience
                    </h2>
                    <v-row class="services-cards">
                        <v-card class="card"><h3>Authentication</h3></v-card>
                        <v-card class="card"><h3 ref="positionFooter">Repairing</h3></v-card>
                        <v-card class="card"> <h3>Logistics</h3></v-card>
                    </v-row>
                </v-row>
                <v-row class="welcome-page-footer">
                    <div class="d-flex flex-column align-center justify-center ga-6">
                        <h2>WANT TO SELL MORE IN B2B?</h2>
                        <h3 class="w-75">
                            Our technology enables suppliers and stock owners to access thousands of other professional
                            resellers, retailers and influencers. Syncs your stock once and access our B2B
                            network to boost your sales.
                        </h3>
                    </div>
                    <v-dialog v-model="dialog" max-width="600">
                        <template v-slot:activator="{ props: activatorProps }">
                            <button v-bind="activatorProps" class="black w-50">Sign up here</button>
                        </template>
                        <SignUpPopUp :dialog="dialog" @update-dialog="() => dialog = !dialog"/>
                    </v-dialog>
                </v-row>
            </v-row>
        </v-container>
    </v-main>

    <div class="bg-image"
        :style="{
            left: positionWholesale.left - (positionWholesale.width * 0.3) + 'px',
            top: [mobileBreakpoint.smAndDown
                ? positionWholesale.top - (positionWholesale.height * 0.5)
                : positionWholesale.top - (positionWholesale.height * 1.5)] + 'px'}">
        <v-parallax class="h-screen" >
            <v-img class="wholesale-img" contain src="/img/welcome-page/hermes_bag_bg.png"></v-img>
        </v-parallax>
    </div>

    <div class="bg-image"
        :style="{
            left: [mobileBreakpoint.width < 1400
                ? positionDropshipping.left + (positionDropshipping.width * 0.5)
                : positionDropshipping.left + (positionDropshipping.width * 0.8)] + 'px',
            top: [mobileBreakpoint.smAndDown
                ? (positionDropshipping.top - (positionDropshipping.height))
                : (positionDropshipping.top - (positionDropshipping.height * 2))] + 'px'}">
        <v-parallax >
            <v-img class="dropshipping-img" src="/img/welcome-page/chanel_bag_bg.png"></v-img>
        </v-parallax>
    </div>

    <div class="bg-image filter-img"
        :style="{left: [mobileBreakpoint.smAndDown
            ? positionFilter.left + (positionFilter.width * 0.3)
            : positionFilter.left] + 'px',
            top: positionFilter.top + (positionFilter.height * 0.5) + 'px'}">
    </div>

    <div class="bg-image services-img"
        :style="{left: positionServices.left + 'px',
            top: [mobileBreakpoint.smAndDown
                ? positionServices.top - (positionServices.height * 3)
                : positionServices.top - (positionServices.height * 5)] + 'px'}">
    </div>

    <div class="bg-image footer-img"
        :style="{left: positionFooter.left + (positionFooter.width) + 'px', top: positionFooter.top + 'px'}">
    </div>

</template>

<style>

.company-description-text h3,
.business h3,
.welcome-page-footer h3 {
    font-family: 'Inconsolata' !important;
}

.page.welcome-page {
    background-image: url("/img/welcome-page/homepage_background.png");
    background-repeat: repeat;
    text-align: center;
    z-index: 1;
    overflow: hidden;
    color: var(--black-grey);
}

.page.welcome-page > .container {
    gap: 8rem;
}

.page.welcome-page h1, .page.welcome-page h2, .page.welcome-page h3 {
    font-family: 'Avenue_Mono';
}

.page.welcome-page h1 {
    font-weight: normal;
    text-transform: uppercase;
}

.page.welcome-page h2 {
    text-transform: uppercase;
}

.page.welcome-page h3 {
    font-weight: normal;
}

.welcome-page .title {
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center;
    mix-blend-mode: hard-light;
    padding-top: 16rem;
    color: var(--white-color);
    margin: 0 1rem;
}

.welcome-page.page .company-description  {
    gap: 6rem;
}

.welcome-page.page .business {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    align-items: center;
    gap: 4rem;

    z-index: 3;
}

.welcome-page.page .business .wholesale,
.welcome-page.page .business .dropshipping {
    width: 50rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    text-align: left;

    z-index: 3;
}

.welcome-page .business > h2 {
    background: var(--white-color);
    border-radius: 10px;
    padding: 0.5rem 2rem;
    display: inline-block;
    margin-bottom: 3rem;
    z-index: 3;
    border: 1px solid var(--light-grey-0);
}

.page.welcome-page .catalog-filter button {
    color: var(--black-grey);
    background-color: var(--color);
    border: 1px solid var(--color);
    height: 3rem;
    margin: 0.4rem;
    border-radius: 10px;
}

.page.welcome-page .catalog-filter button#red {
    --color: rgba(246, 128, 128, 0.5);
}

.page.welcome-page .catalog-filter button#orange {
    --color: rgba(246, 192, 128, 0.5);
}

.page.welcome-page .catalog-filter button#green {
    --color: rgba(128, 246, 147, 0.5);
}

.page.welcome-page .catalog-filter button#blue {
    --color: rgba(128, 196, 246, 0.5);
}

.page.welcome-page .service-footer {
    padding-top: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5rem;
    z-index: 3;
}

.page.welcome-page .services-cards {
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    gap: 2rem;
    margin: 0 auto;
}

.page.welcome-page .services-cards .card {
    background-color: var(--white-color);
    height: 6rem;
    width: 20rem;
    display: flex;
    align-items: center;
    justify-content: center;
    text-transform: uppercase;
    border: 1px solid var(--light-grey-0);
}

.page.welcome-page .welcome-page-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-evenly;
    gap: 8rem;
    /* min-height: 50vh; */
}

.page.welcome-page .welcome-page-footer > button {
    color: var(--black-grey);
    border-color: var(--black-grey);
    text-transform: uppercase;
    margin-bottom: 6rem;
    height: 3rem;
}

.page.welcome-page .welcome-page-footer > button:hover {
    color: var(--white-color);
}

.bg-image {
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    position: absolute;
    z-index: 2;
    mix-blend-mode: hard-light;
    opacity: 0.8;
}

.wholesale-img {
    height: 20rem;
    width: 25rem;
}

.dropshipping-img {
    height: 40rem;
    width: 29rem;
}

.filter-img {
    background-image: url("/img/welcome-page/bracelet_bg.png");
    height: 25rem;
    width: 35rem;
}

.services-img {
    background-image: url("/img/welcome-page/scarf_bg.png");
    height: 30rem;
    width: 25rem;
}

.footer-img {
    background-image: url("/img/welcome-page/chanel_necklace_bg.png");
    height: 30rem;
    width: 29rem;
}

@media only screen and (max-width: 1100px) {

    .page.welcome-page .services-cards {
        gap: 0.5rem;
    }
    .page.welcome-page .services-cards .card {
        width: 18rem;
    }

    .welcome-page.page .business .wholesale,
    .welcome-page.page .business .dropshipping {
        width: 40rem;
    }

    .wholesale-img {
        height: 18rem;
    }

    .footer-img {
        height: 27rem;
        width: 25rem;
    }
}

@media only screen and (max-width: 960px) {
    .wholesale-img {
        height: 15rem;
        width: 20rem;
    }

    .dropshipping-img {
        height: 30rem;
        width: 20rem;
    }

    .footer-img {
        height: 21rem;
        width: 16rem;
    }

    .services-img {
        height: 19rem;
        width: 16rem;
    }

    .filter-img {
        width: 20rem;
    }

    .welcome-page.page .business .wholesale,
    .welcome-page.page .business .dropshipping {
        width: 30rem;
    }

    .page.welcome-page .services-cards .card {
        width: 12rem;
    }
}

@media only screen and (max-width: 620px) {

    .page.welcome-page > .container {
        gap: 6rem;
    }

    .welcome-page.page .title {
        background-size: cover;
    }

    .filter-img, .services-img, .footer-img, .dropshipping-img, .wholesale-img {
        display: none;
    }

    .welcome-page.page .company-description h2 {
        width: 80%;
        margin: 0 auto;
    }

    .welcome-page.page .business {
        gap: 3rem;
    }
    .welcome-page .business > h2 {
        width: 80%;
        margin: 0 auto;
    }
    .welcome-page.page .business .wholesale,
    .welcome-page.page .business .dropshipping {
        text-align: center;
        width: 80%;
        margin: 0 auto;
    }

    .page.welcome-page .service-footer {
        padding-top: 0;
    }

    .page.welcome-page .catalog-filter .filter {
        margin: 0 3rem;
    }

    .page.welcome-page .services-cards {
        flex-direction: column;
        margin: auto;
    }
    .page.welcome-page .services-cards .card {
        height: 4rem;
        width: 20rem;
    }

    .page.welcome-page .welcome-page-footer {
        gap: 5rem;
    }

    .page.welcome-page h1 {
        font-size: 1.5rem;
    }

    .welcome-page .title {
        padding-top: 3rem;
        width: 80%;
        margin: 0 auto;
    }

    .page.welcome-page h2 {
        font-size: 1.125rem;
    }

    .page.welcome-page h3 {
        font-size: 1rem;
    }
}

</style>
