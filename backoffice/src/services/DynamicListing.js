export default class DynamicListing {
    /**
     * Dynamically list entries from the API
     * @param listing_fn {Function} a function used to list a batch of items
     * @param options {Object} an options object
     * @param options.transformer_fn {Function?} an optional transforming
     *     function to apply to listed items
     * @param options.listing_callback {Function?} an optional callback
     *     to call once a batch is listed
     * @param options.scroll_offset {Number?} the maximal scroll offset before
     *     starting to list new batch during handleScroll()
     */
    constructor(
        listing_fn, {
            transformer_fn = null,
            listing_callback = null,
            batch_size = 32,
            scroll_offset = 64,
        } = {}
    ) {
        this.listingFunction = listing_fn;
        this.transformerFunction = transformer_fn;
        this.listingCallback = listing_callback;
        this.scrollOffset = scroll_offset;
        this.items = [];
        this.prevId = 0;
        this.batchSize = batch_size;
        this.isLoading = false;
        this.isFinished = false;
    }

    /**
     * Handle the scroll event of the parent container and list the next batch
     * of entries if the remaining scroll distance is <= than this.scrollOffset
     * @param e {target?: HTMLElement} the target element
     */
    handleScroll({target} = {}) {
        if (
            target &&
            Math.ceil(target.offsetHeight + target.scrollTop)
            >= target.scrollHeight - this.scrollOffset
        )
            void this.listBatch();
    }

    /**
     * Reset the list of entries, restart next listing from the beginning
     */
    reset() {
        this.items = [];
        this.prevId = 0;
        this.isFinished = false;
    }

    /**
     * List the next batch of items
     * @param options {Object?} listing options
     * @param options.reset {boolean?} reset before listing
     * @param options.force {boolean?} list even if the previous batch was last
     *     (useful when new entries have been added since last listing)
     * @returns {Promise<[Object]>} the items array, contains previous and
     *     newly listed items
     */
    async listBatch({reset = false, force = false} = {}) {
        if (reset) {
            this.reset();
            force = true;
        }

        if (
            !this.listingFunction
            || this.isLoading
            || !force && this.isFinished
        )
            return this.items;

        this.isLoading = true;

        try {
            const {data: {items, is_last_batch}} = await this.listingFunction({
                prev_id: this.prevId,
                batch_size: this.batchSize
            });

            this.items.push(...(
                this.transformerFunction
                    ? items.map(this.transformerFunction)
                    : items
            ));
            this.prevId = items.slice(-1)[0]?.id || 0;
            this.isFinished = items.length < this.batchSize || is_last_batch;
        } finally {
            this.isLoading = false;
        }

        this.listingCallback?.();

        return this.items;
    }

    /**
     * Removes an item by its id. Allows for deletions without forcing
     * re-listing
     * @param id {Number} The id of the item to delete
     */
    removeById(id) {
        this.items = this.items.filter(item => item.id != id);
    }
}
