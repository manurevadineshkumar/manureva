<script>
import Popup from "./popups/Popup.vue";

export default {
    props: {
        product: {
            type: Object,
            required: true,
        },
    },
    data() {
        return {
            currentImageIndex: 0,
            zoom: 1,
            rotation: 0,
            grabOffsetX: 0,
            grabOffsetY: 0,
            isGrabbing: false,
            imgMode: 0,
        };
    },
    computed: {
        currentImage() {
            return this.product.image_urls[this.currentImageIndex];
        },
    },
    methods: {
        setCurrentImage(index) {
            this.resetFilter();
            this.currentImageIndex = index;
        },
        zoomIn() {
            this.zoom += 0.1;
        },
        zoomOut() {
            if (this.zoom <= 0.2)
                return;

            this.zoom -= 0.1;
        },
        rotate90() {
            this.rotation += 90;
        },
        minusRotate90() {
            this.rotation -= 90;
        },

        reset() {
            this.resetFilter();
            this.currentImageIndex = 0;
        },
        resetFilter() {
            this.zoom = 1;
            this.rotation = 0;
            this.grabOffsetX = 0;
            this.grabOffsetY = 0;
            this.isGrabbing = false;
            this.imgMode = 0;
        },
        open() {
            this.$refs.popup.open();
        },
        download() {
            fetch(this.changeImgMode(this.currentImage), {cache: "no-store"})
                .then((response) => response.blob())
                .then((blob) => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${this.product.brand.name}-${this.product.id}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                });
        },
        startGrabbing() {
            this.isGrabbing = true;
        },

        moveImage(event) {
            if (this.isGrabbing) {
                this.grabOffsetX += event.movementX;
                this.grabOffsetY += event.movementY;
            }
        },

        stopGrabbing() {
            this.isGrabbing = false;
        },

        changeImgMode(url) {
            if (this.imgMode === 0)
                return url;

            const urlSplit = url.split("/");
            return `${urlSplit.slice(0, -1).join("/")}/${
                this.imgMode === 1 ? "u2net" : "u2netp"
            }/${urlSplit.slice(-1)}.png`;
        },
    },

    components: {
        Popup,
    },
};
</script>

<template>
    <popup ref="popup" class="image-zoom-popup">
        <div class="main-image-container">
            <div
                class="main-image-wrapper"
                @mousedown="startGrabbing"
                @mousemove="moveImage"
                @mouseup="stopGrabbing"
                :style="{
                    transform: `translate(${grabOffsetX}px, ${grabOffsetY}px)`,
                }"
            >
                <div
                    class="main-image-popup"
                    :style="{
                        background: `center / contain no-repeat url(${changeImgMode(currentImage)})`,
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        cursor: isGrabbing ? 'grabbing' : 'grab',
                    }"
                ></div>
            </div>
        </div>
        <div class="img-explorer-menu">
            <button class="button download" @click="download" />
            <button class="button zoomIn" @click="zoomIn" />
            <button class="button zoomOut" @click="zoomOut" />
            <button class="button rotate90" @click="rotate90" />
            <button class="button minusRotate90" @click="minusRotate90" />
            <button class="button reset" @click="resetFilter" />
            <button class="button mode-default" @click="imgMode = 0" :disabled="imgMode === 0" />
            <button class="button mode-one" @click="imgMode = 1" :disabled="imgMode === 1" />
            <button class="button mode-two" @click="imgMode = 2" :disabled="imgMode === 2" />
        </div>
        <div class="thumbnail-images-popup">
            <div
                v-for="(image, index) in product.image_urls"
                :key="index"
                :class="{selected: currentImageIndex === index}"
                :style="{background: `center / contain no-repeat url(${image})`}"
                @click="setCurrentImage(index)"
            ></div>
        </div>
    </popup>
</template>

<style>
.popup.shown.image-zoom-popup {
    display: grid;
    grid-template-rows: auto 1fr auto;
    min-width: 45%;
    min-height: 70%;
    gap: 10px;
}

.image-zoom-popup .main-image-container {
    grid-row: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 5px;
    box-shadow: 0 0 8px #0004;
}

.image-zoom-popup .main-image-wrapper {
    width: 100%;
    height: 100%;
}

.image-zoom-popup .main-image-popup {
    width: 100%;
    height: 100%;
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
    border-radius: 5px;
    background-color: transparent;
    transition: transform 0.3s ease;
    cursor: grab;
    overflow: hidden;
}

.image-zoom-popup .main-image-popup:hover {
    cursor: grabbing;
}

.image-zoom-popup .img-explorer-menu {
    display: grid;
    grid-auto-flow: column;
    gap: 10px;
    justify-content: center;
}

.image-zoom-popup .img-explorer-menu .button {
    --color: var(--grey);
    background-repeat: no-repeat;
    background-position: center;
    background-color: var(--dark-grey);
    background-size: 75%;
    width: 60px;
    height: 60px;
    border-radius: 5px;
    padding: 0;
    border: 0;
    transition: background-color 0.2s ease-in-out;
}

.image-zoom-popup .img-explorer-menu .button.zoomIn {
    background-image: url("/icons/zoom-in.svg");
}

.image-zoom-popup .img-explorer-menu .button.zoomOut {
    background-image: url("/icons/zoom-out.svg");
}

.image-zoom-popup .img-explorer-menu .button.rotate90 {
    background-image: url("/icons/rotate-90.svg");
}

.image-zoom-popup .img-explorer-menu .button.minusRotate90 {
    background-image: url("/icons/rotate-minus-90.svg");
}

.image-zoom-popup .img-explorer-menu .button.reset {
    background-image: url("/icons/reset.svg");
}
.image-zoom-popup .img-explorer-menu .button.download {
    background-image: url("/icons/download.svg");
}
.image-zoom-popup .img-explorer-menu .button.mode-default {
    background-image: url("/icons/model-default.svg");
}
.image-zoom-popup .img-explorer-menu .button.mode-one {
    background-image: url("/icons/model-1.svg");
}
.image-zoom-popup .img-explorer-menu .button.mode-two {
    background-image: url("/icons/model-2.svg");
}

.image-zoom-popup .thumbnail-images-popup {
    display: grid;
    grid-auto-flow: column;
    gap: 6px;
    justify-content: center;
    flex-wrap: wrap;
}

.image-zoom-popup .thumbnail-images-popup > div {
    width: 45px;
    height: 45px;
    background-position: center;
    background-size: cover;
    border-radius: 2px;
    background-color: var(--black-grey);
    opacity: 0.4;
    cursor: pointer;
    transition: opacity ease-in-out 0.1s;
}

.image-zoom-popup .thumbnail-images-popup > div.selected {
    opacity: 1;
}

@media only screen and (max-width: 600px) {
    .image-zoom-popup .img-explorer-menu .button {
        width: 40px;
        height: 40px;
    }
}
</style>
