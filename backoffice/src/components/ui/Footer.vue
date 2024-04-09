<script>
export default {
    data () {
        return {
            links: ["About Us", "Terms & Conditions", "Privacy Policy", "Contact Us"],
        };
    },
};
</script>

<template>
    <v-footer class="footer">
        <img src="/img/korvin.png"/>
        <!-- <div class="footer-links">
            <button
                v-for="link in links"
                :key="link"
                variant="text"
            >
                {{ link }}
            </button>
        </div> -->
        <div class="socials">
            {{ new Date().getFullYear() }} — Korvin
            <a href="https://www.instagram.com/korvin.io?igsh=MXRkaHJ0ajB1MnZ5cg==" target="_blank"
                rel="noopener noreferrer">
                <font-awesome-icon icon="fa-brands fa-instagram" style="color: var(--mid-grey);" />
            </a>
            <a href="https://www.linkedin.com/company/korvin/about/" target="_blank" rel="noopener noreferrer">
                <font-awesome-icon icon="fa-brands fa-linkedin" style="color: var(--mid-grey);" />
            </a>
        </div>
    </v-footer>
</template>

<style>
.footer {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    justify-content: center;
    align-items: space-evenly;
    background-color: var(--white-grey) !important;
}

.v-footer {
    height: 10rem;
    border-top-color: var(--light-grey-0)  !important;
    border-top-width: 1px !important;
    padding: 1.5rem 0 !important;
}

.footer img {
    height: 40px;
}

.footer-links {
    border: 1px solid var(--mid-grey);
    border-left: none;
    border-right: none;
    color: var(--mid-grey);
}

.footer-links button {
    font-weight: normal;
    border: none;
    color: var(--mid-grey);
}

.footer-links button:hover {
    background-color: transparent;
    color: var(--black-color);
}

.socials {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: var(--mid-grey);
}

.socials a {
    font-size: 20px;
}

@media only screen and (max-width: 600px) {
    .footer-links button {
        padding: 5px;
        font-size: 10px;
    }

    .footer img {
        height: 30px;
    }

    .v-footer {
        height: 6rem;
        gap: 1rem;
    }
}
</style>
