<script>

export default {
    emits: ["open", "close"],

    data() {
        return {
            isOpen: false,
        };
    },

    methods: {
        /**
         * Handle the click event.
         * Emit the close/open event if the accordion was closed/open.
         */
        handleClick() {
            if (this.isOpen) {
                this.isOpen = false;
                this.$emit("close");
            } else {
                this.isOpen = true;
                this.$emit("open");
            }
        },

    }
};
</script>

<template>
    <div class="accordion" :class="{open: isOpen}">
        <button class="accordion-button" @click=handleClick>
            <slot name="title"></slot>
        </button>
        <div class="accordion-content">
            <slot name="content"></slot>
        </div>
    </div>
</template>

<style>

.accordion {
    display: flex;
    flex-direction: column;
    position: relative;
}
.accordion .accordion-button {
    width: 100%;
    height: 40px;
    padding: 0 50px 0 20px;
    border: none;
    border-radius: 0;
    border-bottom: 1px solid var(--see-through-grey);
    transition: all .1s ease-in-out;
    font-family: Avenue_Mono;
}
.accordion .accordion-button::after {
    content: "";
    display: block;
    position: absolute;
    top: 0;
    right: 0;
    background: url("/icons/chevron-down.svg") no-repeat center;
    background-size: 25px;
    width: 38px;
    height: 38px;
    transition: transform .1s ease-in-out;
}
.accordion.open .accordion-button::after {
    transform: rotate(-.5turn);
}
.accordion .accordion-button:hover {
    background-color: initial;
    color: var(--light-grey-1);
}
.accordion .accordion-button:active {
    box-shadow: none;
    background-color: var(--see-through-black-0);
}
.accordion .chevron-down-icon {
    display: inline-block;
    position: absolute;
    right: 0;

    cursor: pointer;
}
.accordion .chevron-down-icon.rotate{
    transform: rotate(180deg);
}

.accordion-content {
    max-height: 0;
    transition: all 0.2s ease-in-out;
    overflow: hidden;
}
.accordion.open .accordion-content {
    max-height: 500px;
}
</style>
