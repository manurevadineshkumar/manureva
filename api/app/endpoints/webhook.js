const ShopifyProductWebhookService = require("../business-services/shop/shopify/ShopifyProductWebhook.service");
const ShopifyWebhookHelper = require("../business-services/shop/shopify/helper/ShopifyWebhook.helper");
const SlackLogger = require("../services/SlackLogger");

class Route {
    static async triggerShopifyProductCreateWebhook({req}) {
        const shop = await ShopifyWebhookHelper.checkShopifyWebhook({req: req});

        await ShopifyProductWebhookService.importShopifyProductFromId({shop, id: req.body.admin_graphql_api_id});
    }

    static async triggerShopifyProductUpdateWebhook({req}) {
        const shop = await ShopifyWebhookHelper.checkShopifyWebhook({req: req});

        await ShopifyProductWebhookService.updateShopifyProductFromId({
            shop,
            id: req.body.admin_graphql_api_id
        });
    }

    static async triggerShopifyProductDeleteWebhook({req}) {
        const shop = await ShopifyWebhookHelper.checkShopifyWebhook({req: req});

        await ShopifyProductWebhookService.deleteShopifyProductFromId({
            shop,
            id: req.body.id
        });
    }

    static async triggerShopifyOrderCreateWebhook({req}) {
        const shop = await ShopifyWebhookHelper.checkShopifyWebhook({req: req});

        SlackLogger.sendMessage({
            channel_id: process.env.SLACK_SHOPIFY_ORDERS_CHANNEL_ID,
            text: `Webhook orders/create received from ${shop.name}.\n`
                + `\`\`\`\n${JSON.stringify(req.body)}\n\`\`\``
        });
    }

    static async triggerShopifyCartCreateWebhook({req}) {
        const shop = await ShopifyWebhookHelper.checkShopifyWebhook({req: req});
        void shop;

        // SlackLogger.sendMessage({
        //     channel_id: process.env.SLACK_SHOPIFY_ORDERS_CHANNEL_ID,
        //     text: `Webhook carts/create received from ${shop.name}.\n`
        //         + `\`\`\`\n${JSON.stringify(req.body)}\n\`\`\``
        // });
    }

    static async triggerShopifyCartUpdateWebhook({req}) {
        const shop = await ShopifyWebhookHelper.checkShopifyWebhook({req: req});
        void shop;

        // SlackLogger.sendMessage({
        //     channel_id: process.env.SLACK_SHOPIFY_ORDERS_CHANNEL_ID,
        //     text: `Webhook carts/update received from ${shop.name}.\n`
        //         + `\`\`\`\n${JSON.stringify(req.body)}\n\`\`\``
        // });
    }
}

module.exports = Route;
