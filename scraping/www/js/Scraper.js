import Api from "./Api.js";

export default class Scraper {
    constructor($template, data, manager) {
        this.id = data.id;
        this.manager = manager;
        this.data = {};
        this.startTime = Date.now();
        this.avgTime = null;

        this.$root = $template.content.children[0].cloneNode(true);

        this.$ = {
            stateBar:      this.$root.querySelector(".state-bar"),
            stateFill:     this.$root.querySelector(".state-fill"),
            title:         this.$root.querySelector("h1"),
            activeInput:   this.$root.querySelector(".active-input"),
            url:           this.$root.querySelector(".url"),
            progressBar:   this.$root.querySelector(".progress-bar"),
            steps:         this.$root.querySelector(".steps"),
            currentTiming: this.$root.querySelector(".current-timing"),
        };

        Object.assign(this, data);

        this.$.activeInput.addEventListener("input", () =>
            Api.setScraperActive(this.id, this.$.activeInput.checked)
        );
    }

    update(data) {
        delete data.id;
        Object.assign(this, data);
    }

    updateTiming() {
        if (this.data.state == "idle") {
            this.currentTiming = null;
            return;
        }

        this.currentTiming = (Date.now() - this.startTime) / 1e3;
    }

    rotateTiming() {
        const time = (Date.now() - this.startTime) / 1e3;

        this.startTime = Date.now();
        this.avgTime = this.manager.avgTime;

        return time;
    }

    set progress(val) {
        this.data.progress = val;
        this.$.stateFill.style.width = val * 100 + "%";
    }

    set state(val) {
        if (val == this.data.state)
            return;

        this.data.state = val;
        this.$.stateBar.classList.toggle("idle", val == "idle");
    }

    set name(val) {
        this.data.name = val;
        this.$.title.innerText = val;
    }

    set active(val) {
        this.data.active = val;
        this.$.activeInput.checked = val;
    }

    get active() {
        return this.data.active;
    }

    set url(val) {
        this.data.url = val;

        if (val)
            this.$.url.href = val;
        else
            this.$.url.removeAttribute("href");

        this.$.url.innerText = val || "";
    }

    set currentTiming(val) {
        if (this.avgTime !== null)
            this.$.progressBar.style.width = Math.min(
                1,
                val / this.avgTime
            ) * 100 + "%";

        this.$.currentTiming.textContent = val === null
            ? "-"
            : val.toFixed(1) + "s";
    }
}
