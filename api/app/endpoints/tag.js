const Tag = require("../models/Tag");
const {PERMISSIONS} = require("../models/Permissions");

const ProductsGroupExporter = require("../services/ProductsGroupExporter");

const HttpError = require("../errors/HttpError");

class Route {
    static async createTag({user, body: {name}}) {
        await user.assertPermission(PERMISSIONS.TAG_CREATE);

        if (await Tag.getByName(name, user.id))
            throw new HttpError(409, "duplicate tag name");

        const tag = await Tag.create({user_id: user.id, name});

        return tag.serialize();
    }

    static async downloadTagCSV({res, path: {id}, query: {token}}) {
        const tag = await Tag.getById(id, null, true);

        if (!tag)
            throw new HttpError(404, "no such tag");

        if (tag.productsGroup.token != token)
            throw new HttpError(401, "invalid token");

        const exporter = new ProductsGroupExporter(tag.productsGroup);

        await exporter.export(res);
    }

    static async listTags({user, query: {prev_id, batch_size}}) {
        await user.assertPermission(PERMISSIONS.TAG_LIST);

        const tags = await Tag.listForUser(user.id, prev_id, batch_size + 1);

        return {
            items: tags
                .slice(0, batch_size)
                .map(tag => tag.serialize()),
            ...(tags.length < batch_size + 1 ? {is_last_batch: 1} : {})
        };
    }

    static async addProductTags({user, path: {tag_id}, body: {product_ids}}) {
        const tag = await Tag.getById(tag_id, user.id);

        if (!tag)
            throw new HttpError(404, "no such tag");

        if (tag.productsGroup.isSystem)
            throw new HttpError(400, "cannot modify a system tag");

        return {success: true, count: await tag.addProductIds(product_ids)};
    }

    static async removeProductTags({
        user,
        path: {tag_id},
        body: {product_ids}
    }) {
        const tag = await Tag.getById(tag_id, user.id);

        if (!tag)
            throw new HttpError(404, "no such tag");

        if (tag.productsGroup.isSystem)
            throw new HttpError(400, "cannot modify a system tag");

        return {success: true, count: await tag.removeProductIds(product_ids)};
    }

    static async updateTag({user, path: {id}, body: {name}}) {
        await user.assertPermission(PERMISSIONS.TAG_UPDATE);

        const tag = await Tag.getById(id, user.id);

        if (!tag)
            throw new HttpError(404, "no such tag");

        if (tag.productsGroup.isSystem)
            throw new HttpError(400, "cannot update a system tag");

        if (
            name
            && name.toLocaleLowerCase() != tag.name.toLocaleLowerCase()
            && await Tag.getByName(name, user.id)
        )
            throw new HttpError(409, "duplicate tag name");

        if (name)
            await tag.update({name});

        return tag.serialize();
    }

    static async deleteTag({user, path: {id}}) {
        await user.assertPermission(PERMISSIONS.TAG_DELETE);

        const tag = await Tag.getById(id, user.id);

        if (!tag)
            throw new HttpError(404, "no such tag");

        if (tag.productsGroup.isSystem)
            throw new HttpError(400, "cannot delete a system tag");

        await tag.delete();

        return {success: true};
    }
}

module.exports = Route;
