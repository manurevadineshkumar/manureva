const ProductsGroup = require("./ProductsGroup");

const TagStorage = require("../storage/TagStorage");

class Tag {
    constructor(data) {
        this.productsGroup = new ProductsGroup(data.products_group);
        this.id = +data.id;
        this.name = data.name;
        this.ownerId = this.productsGroup.userId;
    }

    serialize() {
        return {
            id: +this.id,
            name: this.name,
            owner_id: this.ownerId,
            products_group: this.productsGroup.serialize()
        };
    }

    /**
     * Gets a tag by its ID and its owner's ID
     * @param id {Number} a tag ID
     * @param user_id {Number} its owner's ID
     * @param skip_ownership_check {Boolean} if set to `true` and `user_id` is
     * `null`, skips the ownership check
     * @return {Promise<?Tag>}
     */
    static async getById(id, user_id, skip_ownership_check = false) {
        const data = await TagStorage.getById(id, user_id);

        return data && (
            skip_ownership_check || data.products_group.user_id == user_id
        )
            ? new Tag(data)
            : null;
    }

    /**
     * Gets a shop by its name
     * @param name {String}
     * @param user_id
     * @return {Promise<?Tag>}
     */
    static async getByName(name, user_id) {
        const data = await TagStorage.getByName(name, user_id);

        return data ? new Tag(data) : null;
    }

    /**
     * Creates a new tag
     * @param user_id {Number} the tag's owner ID
     * @param name {String} the tag's name
     * @return {Promise<Tag>}
     */
    static async create({user_id, name}) {
        const data = await TagStorage.create({user_id, name});

        return new Tag(data);
    }

    /**
     * Lists tags for a user
     * @param user_id {Number} a user id
     * @param prev_id {Number} previous id for pagination
     * @param batch_size {Number} batch size for pagination
     * @return {Promise<Tag[]>}
     */
    static async listForUser(user_id, prev_id = 0, batch_size = 16) {
        const tags_data = await TagStorage.listForUser(
            user_id, prev_id, batch_size
        );

        return tags_data.map(data => new Tag(data));
    }

    /**
     * Filters tag ids for a user
     * @param tag_ids {Number[]} previous id for pagination
     * @param user_id {Number} a user id
     * @return {Promise<Set<Number>>}
     */
    static async filterIdsForUser(tag_ids, user_id) {
        return user_id
            ? new Set(await TagStorage.filterForUser(tag_ids, user_id))
            : new Set;
    }

    /**
     * Triggers an update of the `New` system tag products.
     * After this operation, the `New` tag will only contain products whose
     * `creation_date` is at most < to 1 month in the past
     * @return {Promise<void>}
     */
    static async updateNewTag() {
        await TagStorage.updateNewTag();
    }

    /**
     * Updates the tag
     * @param attributes {Object} tag attributes to update
     * @param attributes.name {String} the tag name
     * @return {Promise<void>}
     */
    async update({name}) {
        if (name && name != this.name) {
            await TagStorage.update(this.id, {name});
            this.name = name;
        }
    }

    /**
     * Adds products to the tag by IDs
     * @param product_ids {Array<Number>} an array of product IDs
     * @return {Promise<Number>}
     */
    async addProductIds(product_ids) {
        return await this.productsGroup.addProductIds(product_ids);
    }

    /**
     * Removes products from the tag by IDs
     * @param product_ids {Array<Number>} an array of product IDs
     * @return {Promise<Number>}
     */
    async removeProductIds(product_ids) {
        return await this.productsGroup.removeProductIds(product_ids);
    }

    /**
     * Deletes the tag
     * @return {Promise<void>}
     */
    async delete() {
        await TagStorage.delete(this.id);
        await this.productsGroup.delete();
    }
}

module.exports = Tag;
