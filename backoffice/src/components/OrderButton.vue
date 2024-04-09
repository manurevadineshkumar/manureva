<script>
export default {
    emits: ["click"],

    props: {
        productId: {
            type: Number,
            required: true,
        },
    },

    data() {
        return {
            statusClass: "place-order--default",
        };
    },

    methods: {
        placeOrder() {
            this.statusClass = "place-order--placing";
            setTimeout(() => {
                this.statusClass = "place-order--done";
                this.$refs.button.disabled = true;
            }, 3600);
        },

        onClick() {
            if (this.statusClass !== "place-order--default") {
                return;
            }
            this.$emit("click");
        },

        resetButton() {
            this.statusClass = "place-order--default";
            this.$refs.button.disabled = false;
        },

        async animate() {
            this.placeOrder();
            await this.onClick();
        },
    },

    watch: {
        productId() {
            this.resetButton();
        },
    },
};
</script>

<template>
    <div ref="button" class="button place-order outline" :class="[statusClass]" @click="onClick">
        <div class="default text">Place Order</div>
        <div class="forklift">
            <div class="upper"/>
            <div class="lower"/>
        </div>
        <div class="box animation"/>
        <div class="done text">Order Placed ✅</div>
    </div>
</template>

<style>
.place-order {
    --color: var(--regular-blue);
    margin: 0;
    padding: 0;
    min-width: 160px;
    min-height: 45px;
    width: 160px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    outline: none;
}

.button.place-order {
    display: flex;
    align-items: center;
    justify-content: center;
}

.button.place-order:hover {
    background-color: var(--black-color);
}

.place-order--placing {
    cursor: progress;
    background-color: var(--regular-blue);
}

.place-order .text {
    opacity: 0;
    font-weight: bold;
    font-size: 16px;
    position: absolute;
    text-align: center;
    transition: all 0.2s;
    transform: translateY(20px);
}

.place-order:focus .text {
    outline: none;
}

.place-order .forklift {
    display: none;
    transform: scale(0.4);
    position: absolute;
    top: -2px;
    left: -65px;
    animation: lift-moving 4s infinite;
}

.place-order .forklift .upper {
    width: 34px;
    height: 20px;
    margin-bottom: 2px;
    border: 5px solid var(--salmon-orange);
    position: relative;
    border-radius: 10px 50px 10px 5px;
}

.place-order .forklift .upper:after {
    content: "";
    width: 30px;
    height: 50px;
    position: absolute;
    left: 170%;
    top: 12px;
    box-sizing: border-box;
    border-left: 5px solid var(--black-color);
    border-bottom: 6px solid var(--black-color);
    border-radius: 0 0 0 5px;
    transform-origin: center;
}

.place-order .forklift .lower {
    width: 60px;
    height: 30px;
    position: relative;
    background-color: var(----bright-orange);
    border-radius: 5px 15px 10px 10px;
}

.place-order .forklift .lower:before,
.place-order .forklift .lower:after {
    content: "";
    width: 20px;
    height: 20px;
    position: absolute;
    left: 0;
    bottom: -10px;
    border: 3px solid var(--regular-blue);
    border-radius: 50%;
    background-color: var(--black-color);
}

.place-order .forklift .lower:after {
    left: 36px;
}

.place-order .box {
    display: none;
    width: 50px;
    height: 50px;
    background-color: var(--beige);
    border-radius: 5px;
    position: absolute;
    top: 56px;
    left: 50px;
    transform: scale(0.4);
    animation: box 4s infinite;
}

.place-order .box:before,
.place-order .box:after {
    content: "";
    width: 4px;
    height: 12px;
    left: 21px;
    background-color: var(--yellow-beige);
    position: absolute;
}

.place-order .box:after {
    height: 10px;
    left: 25px;
}

.place-order--default .text {
    opacity: 1;
    transform: translateY(0);
}
.place-order--default .text.done {
    opacity: 0;
    transform: translateY(-20px);
}

.place-order--default .forklift .default {
    transform: translateY(20px);
}

.place-order--default .forklift .done {
    display: none;
    transform: translateY(0);
}

.place-order--placing .forklift {
    display: block;
}

.place-order--placing .box {
    display: block;
}

.place-order--placing .text.default {
    transform: translateY(-20px);
}

.place-order--done .text.done {
    opacity: 1;
    transform: translateY(0);
}

.place-order--done {
    cursor: not-allowed;
}

.place-order--done .text.default {
    transform: translateY(-20px);
}

@keyframes lift-moving {
    0% {
        left: -65px;
    }
    50% {
        left: 20px;
    }
    60% {
        left: 15px;
    }
    100% {
        left: 200px;
    }
}

@keyframes box {
    0% {
        top: 56px;
    }
    20% {
        top: 6px;
        left: 50px;
    }
    50% {
        top: 6px;
        left: 50px;
    }
    60% {
        top: 6px;
        left: 45px;
    }
    100% {
        top: 6px;
        left: 230px;
    }
}
</style>
