<script>
export default {
    emits: ["open", "close"],

    props: {
        class: String,
    },

    data() {
        return {
            isOpen: false,
        };
    },

    methods: {
        open() {
            this.isOpen = true;
            this.$emit("open");

            return new Promise(resolve => setTimeout(resolve, 200));
        },

        close() {
            this.isOpen = false;
            this.$emit("close");

            return new Promise(resolve => setTimeout(resolve, 200));
        },

        onClickOverlay(e) {
            if (e.target === this.$refs.overlay)
                this.close();
        },
    },
};
</script>

<template>
    <teleport to="body">
        <transition name="popup">
            <section v-show="isOpen" ref="overlay" class="popup-overlay" @click="onClickOverlay">
                <section class="popup" :class="[this.class]">
                    <slot/>
                </section>
            </section>
        </transition>
    </teleport>
</template>

<style>
.popup-overlay {
    position: fixed;
    display: flex;
    justify-content: center;
    align-items: start;
    width: 100vw;
    height: 100vh;
    top: 0;
    left: 0;
    background: #000a;
    backdrop-filter: blur(4px);
    overflow-y: auto;
    overflow-x: hidden;
    z-index: 100;
    transition: all .2s ease;
}
.popup-overlay.popup-enter-from,
.popup-overlay.popup-leave-to {
    opacity: 0;
    backdrop-filter: blur(0);
}

.popup {
    display: block;
    min-width: 300px;
    max-width: 100vw;
    margin: 40px;
    background: var(--white-color);
    border-radius: 10px;
    transform: none;
    padding: 15px;
    z-index: 1;
    transition: all .2s ease-out;
}

.popup-enter-from .popup,
.popup-leave-to .popup {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
}
</style>
