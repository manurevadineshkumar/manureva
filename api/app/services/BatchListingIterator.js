class BatchListingIterator {
    /**
     * A class that allows iterating over batches of items that can be listed
     * using listing_fn. Batches are loaded by calling
     * `listing_fn(prev_id, batch_size)` and have at most `batch_size` products.
     * @param listing_fn {Function} the listing function, takes a `prev_id` and
     *     should return items with `id` > `prev_id`
     * @param batch_size {number} the max amount of items per batch
     */
    constructor(listing_fn, batch_size = 1024) {
        this.listingFn = listing_fn;
        this.batchSize = batch_size;
    }

    /**
     * Iterates over each batch of items
     * @returns {AsyncIterator<Object[]>}
     */
    async *[Symbol.asyncIterator]() {
        let batch;

        for (
            batch = await this.listingFn(0, this.batchSize);
            batch.length == this.batchSize;
            batch = await this.listingFn(batch.slice(-1)[0].id, this.batchSize)
        ) {
            yield batch;
        }

        yield batch;
    }
}

module.exports = BatchListingIterator;
