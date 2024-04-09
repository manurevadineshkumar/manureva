const ProductsBatchIterator = require("./BatchListingIterator");

class ListingIterator {
    /**
     * A class that allows iterating over multiple items that can be listed
     * using listing_fn. Products are loaded in batches of `batch_size` by
     * calling `listing_fn(prev_id, batch_size)`.
     * @param listing_fn {Function} the listing function, takes a `prev_id` and
     *  `batch_size`, and should return at most `batch_size` items with
     *  `id` > `prev_id`
     * @param batch_size {number} the max amount of items per batch
     */
    constructor(listing_fn, batch_size = 1024) {
        this.batches = new ProductsBatchIterator(listing_fn, batch_size);
    }

    /**
     * Iterates over each item in each batch
     * @returns {AsyncIterator<Object>}
     */
    async *[Symbol.asyncIterator]() {
        for await (const batch of this.batches) {
            for (const item of batch)
                yield item;
        }
    }
}

module.exports = ListingIterator;
