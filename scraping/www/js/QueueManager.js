export default class QueueManager {
    constructor() {
        this.$root = document.querySelector(".queue-page");
        this.size = null;

        this.$ = {
            sizeLabel: document.querySelector(".queue-size"),
            queue:     this.$root.querySelector(".queue-body"),
        }
    }

    set queue({size, head}) {
        this.size = size;
        this.$.sizeLabel.innerText = size;
        this.$.queue.innerHTML = "";

        head.forEach(item => {
            const a = document.createElement("a");

            this.$.queue.append(a);

            if (item.type === 0) {
                a.classList.add("type-listing");
                a.innerText = `${item.vendor}: ` + (
                    item.params.search || item.params.brand
                );
                return;
            }
            if (item.type === 1) {
                a.href = item.url;
                a.target = "_blank";
                a.innerText = `${item.vendor}: ${item.url}`;
            }
        });
    }
}
