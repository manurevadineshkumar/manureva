<script>
export default {
    data() {
        return {
            toasts: [],
            toastId: 0,
        };
    },

    methods: {
        showToast(message, options = {}) {
            const defaultOptions = {
                type: "info",
                color: "gray",
                duration: 2000,
                redirect: null,
            };

            const userOptions = {
                ...defaultOptions,
                ...options,
            };

            const toast = {
                id: this.toastId++,
                message,
                startTime: new Date().getTime(),
                ...userOptions,
            };

            this.toasts.push(toast);

            if (toast.duration > 0) {
                setTimeout(() => {
                    this.removeToast(toast.id);

                    if (toast.redirect)
                        this.redirectTo(toast.redirect);
                }, toast.duration);
            }
        },

        removeToast(id) {
            this.toasts = this.toasts.filter(toast => toast.id !== id);
        },

        redirectTo(url) {
            window.location.href = url;
        },
    },
};
</script>

<template>
    <div class="toast-container">
        <transition-group name="toast" tag="div">
            <div
                v-for="toast in toasts"
                :key="toast.id"
                :class="['toast', toast.type]"
                @click="() => removeToast(toast.id)"
            >
                <div class="toast-content">
                    {{ toast.message }}
                </div>
                <div class="toast-progress-bar" :style="{animationDuration: toast.duration + 'ms'}"/>
            </div>
        </transition-group>
    </div>
</template>

<style>
.toast-container {
    position: fixed;
    top: 80px;
    right: 10px;
    z-index: 9999;
}

@keyframes toast-progress-bar {
    0% {
        width: 0;
    }
    100% {
        width: 100%;
    }
}

.toast-container .toast-progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background-color: var(--see-through-black-2);
    border-radius: 0 4px 4px 4px;
    animation: toast-progress-bar 0s linear;
}

.toast-container .toast {
    margin-top: 10px;
    padding: 20px;
    border-radius: 4px;
    color: var(--black-color);
    position: relative;
    opacity: 1;
    cursor: pointer;
    transition: opacity 0.3s ease-in-out;
}

.toast-container .toast-enter-active,
.toast-container .toast-leave-active {
    transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
}

.toast-container .toast-enter-from,
.toast-container .toast-leave-to {
    opacity: 0;
    transform: translateX(25%);
}

.toast-container .toast.info {
    background-color: var(--bright-blue);
    box-shadow: 0 0 8px var(--regular-blue);
}

.toast-container .toast.success {
    background-color: var(--faded-green);
    box-shadow: 0 0 8px var(--bright-green);
}

.toast-container .toast.warning {
    background-color: var(--regular-orange);
    box-shadow: 0 0 10px var(--bright-orange);
}

.toast-container .toast.error {
    background-color: var(--danger-red);
    box-shadow: 0 0 10px var(--regular-red);
}

.toast-container .toast-content {
    font-size: 17px;
    font-weight: bold;
    color: var(--black-color);
    text-shadow: 1px 2px 0 var(--see-through-black-2);
    word-wrap: break-word;
    max-width: 350px;
}
</style>
