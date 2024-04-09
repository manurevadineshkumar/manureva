const SalesChannel = require("../models/SalesChannel");
const {PERMISSIONS} = require("../models/Permissions");

const HttpError = require("../errors/HttpError");

class Route {
    static async listSalesChannels({user, query: {prev_id, batch_size}}) {
        await user.assertPermission(PERMISSIONS.SALES_CHANNEL_LIST);
        const channels = await SalesChannel.listAll(prev_id, batch_size + 1);
        return {
            items: channels
                .slice(0, batch_size)
                .map((channel) => channel.serialize()),
            ...(channels.length < batch_size + 1 ? {is_last_batch: 1} : {}),
        };
    }

    static async getSalesChannelById({user, path: {id}}) {
        await user.assertPermission(
            PERMISSIONS.SALES_CHANNEL_READ_DETAILS
        );
        const channel = await SalesChannel.getById(id);

        if (!channel)
            throw new HttpError(404, "no such channel");
        return channel.serialize();
    }
}

module.exports = Route;
