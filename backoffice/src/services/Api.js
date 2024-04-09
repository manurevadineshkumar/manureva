import User from "../models/User.js";

export default class Api {
    static BASE_URL = window.location.protocol == "https:"
        ? "https://api.korvin.io"
        : "http://127.0.0.1:8080";

    static cache = {
        shop_platforms: null
    };

    static user = null;

    static async request(
        path,
        method = "GET",
        data = null,
        is_multipart = false,
        is_file = false
    ) {
        const query_params = data && method == "GET"
            ? "?" + new URLSearchParams(data)
            : "";
        const url = Api.BASE_URL + path + query_params;
        const body = !data || method == "GET"
            ? null
            : is_multipart ? data : JSON.stringify(data);
        const headers = is_multipart
            ? {}
            : { "Content-Type": "application/json" };
        let res;

        try {
            res = await fetch(url, {
                method,
                headers,
                credentials: "include",
                body
            });
        } catch (err) {
            return { data: { error: "failed to connect to server" } };
        }

        return is_file
            ? await res.blob()
            : {
                data: await res.json(),
                status: res.status
            };
    }

    static async loadUser() {
        const user = await Api.getUser() || null;

        Api.user = user;

        return user;
    }

    static async getUser() {
        const user = (await Api.request("/users")).data?.user;

        return user ? new User(user) : null;
    }

    static async getUserById(id) {
        const user = (await Api.request(`/users/${+id}`)).data?.user;

        return user ? new User(user) : null;
    }

    static async signIn({ username, password }) {
        const res = await Api.request(
            "/sessions",
            "POST",
            { username, password }
        );

        if (res.data.success)
            await Api.loadUser();

        return res;
    }
    //forgetpassword
    static async forgetPassword({ email }) {
        return await Api.request("/forgetpassword", "GET", { email });
    }
    //checktocken valitity
    static async checkTokenValidity({ token }) {
        return await Api.request("/checkTokenValidity", "GET", { token });
    }
    //reset password
    static async resetPassword({ currentUseID, password, token }) {
        return await Api.request("/resetPassword", "POST", { currentUseID, password, token });
    }
    //profile change password
    static async changePassword({ currentUseID, password }) {
        return await Api.request("/changePassword", "POST", { currentUseID, password });
    }
    static async signOut() {
        await Api.request("/sessions", "DELETE");

        Api.user = null;
    }

    static async searchProducts({ filters, prev_id, batch_size }) {
        return await Api.request("/products", "GET", {
            ...Object.fromEntries(
                Object.entries(filters)
                    .map(([key, value]) => [
                        key,
                        Array.isArray(value) ? value.join("-") || null : value
                    ])
                    .filter(([_, value]) => (value ?? null) !== null)
            ),
            prev_id,
            batch_size
        });
    }

    static async orderProduct({ product_id, channel_id }) {
        return Api.request("/orders", "POST", { product_id, channel_id });
    }

    static async updateProduct({ product_id, fields }) {
        return await Api.request(`/products/${+product_id}`, "PATCH", fields);
    }

    static async setProductTags(product_id, tag_ids) {
        return await Api.request(
            `/products/${+product_id}/tags`,
            "PUT",
            { tag_ids }
        );
    }

    static async listOrders({ prev_id, batch_size = 16, user_type }) {
        return await Api.request(
            `/orders`,
            "GET",
            { user_type, prev_id, batch_size }
        );
    }

    static async updateOrder({ order_id, data }) {
        return await Api.request(`/orders/${+order_id}/`, "PATCH", data);
    }

    static async listChannels({ prev_id, batch_size = 16 }) {
        return await Api.request("/channels", "GET", { prev_id, batch_size });
    }

    static async getChannelById({ id }) {
        return await Api.request(`/channels/${id}`);
    }

    static async getProductById(product_id) {
        return await Api.request(`/products/${+product_id}`);
    }

    static async getOrderFile({ order_id }) {
        return await Api.request(
            `/orders/${+order_id}/file`, "GET",
            null, true, true
        );
    }

    static async putDocumentOrder({ order_id, document }) {
        return await Api.request(
            `/orders/${+order_id}/file`, "PUT",
            document, true
        );
    }

    static async listCountries() {
        return await Api.request("/countries");
    }

    static async listColors() {
        return await Api.request("/colors");
    }

    static async createColor({ name }) {
        return await Api.request("/colors", "POST", { name });
    }

    static async listMaterials() {
        return await Api.request("/materials");
    }

    static async createMaterial({ name }) {
        return await Api.request("/materials", "POST", { name });
    }

    static async listBrands() {
        return await Api.request("/brands");
    }

    static async createBrand({ name }) {
        return await Api.request("/brands", "POST", { name });
    }

    static async listTypes() {
        return await Api.request("/types");
    }

    static async createType({ name }) {
        return await Api.request("/types", "POST", { name });
    }

    static async listSubtypes() {
        return await Api.request("/subtypes");
    }

    static async createSubtype({ name }) {
        return await Api.request("/subtypes", "POST", { name });
    }

    static async listTags({ prev_id, batch_size = 16 }) {
        return await Api.request("/tags", "GET", { prev_id, batch_size });
    }

    static async createTag({ name }) {
        return await Api.request("/tags", "POST", { name });
    }

    static async editTag({ id, name }) {
        return await Api.request("/tags/" + +id, "PATCH", { name });
    }

    static async deleteTag({ id }) {
        return await Api.request("/tags/" + +id, "DELETE");
    }

    static async addProductTags(tag_id, product_ids) {
        return await Api.request(
            `/tags/${+tag_id}/products`,
            "PUT",
            { product_ids }
        );
    }

    static async removeProductTags(tag_id, product_ids) {
        return await Api.request(
            `/tags/${+tag_id}/products`,
            "DELETE",
            { product_ids }
        );
    }

    static async createProduct({ product }) {
        return await Api.request("/products", "POST", product);
    }

    static async addImagesToProduct({ product_id, images }) {
        return await Api.request(
            `/products/${+product_id}/images`,
            "POST",
            images,
            true
        );
    }

    static async getProductsStatistics() {
        return await Api.request(
            `/products/statistics`,
            "GET"
        );
    }

    static async getLogSessions({ prev_id, batch_size = 16 }) {
        return await Api.request(
            `/logs/sessions`,
            "GET",
            { prev_id, batch_size }
        );
    }

    static async getLogSessionById({ prev_id, batch_size = 16, id }) {
        return await Api.request(
            `/logs/sessions/${id}`,
            "GET",
            { prev_id, batch_size }
        );
    }

    static async getModuleSession({ id }) {
        return await Api.request(
            `/logs/modules/${id}`,
            "GET"
        );
    }
    static async createSingupLink(data) {
        const result = await Api.request(
            `/`,
            "POST",
            data
        );

        if (result.success)
            await Api.loadUser();

        return result;
    }

    static async createUser(data, token) {
        const result = await Api.request(
            `/users?token=${token}`,
            "POST",
            data
        );

        if (result.success)
            await Api.loadUser();

        return result;
    }

    static async uploadUserCertificates({ certificates }) {
        return await Api.request(
            `/users/certificates`,
            "POST",
            certificates,
            true
        );
    }

    static async listUsers({ prev_id, batch_size = 16 }) {
        const result = await Api.request(
            "/users/all",
            "GET",
            { prev_id, batch_size }
        );

        result.data.items = result.data.items.map(user => new User(user));

        return result;
    }

    static async listPermissions() {
        return await Api.request("/permissions");
    }

    static async updateUser(id, data) {
        return await Api.request(`/users/${+id}`, "PATCH", data);
    }

    static async downloadCertificate(id) {
        return await Api.request(
            `/users/certificates/${id}/file`,
            "GET",
            null,
            false,
            true
        );
    }

    static async deleteCertificate(certificate) {
        return await Api.request(
            "/users/certificates",
            "DELETE",
            { certificate_ids: [certificate] }
        );
    }

    static async getFileModule({ id }) {
        return await Api.request(
            `/logs/modules/${id}/file`,
            "GET",
            null,
            true,
            true
        );
    }

    static async userSetPermissions(id, permissions) {
        return await Api.request(
            `/users/${+id}/permissions`,
            "PUT",
            permissions
        );
    }

    static async listUserTags(userId) {
        return await Api.request(`/users/${+userId}/tags`, "GET");
    }

    static async getProductsBySessionId({ prev_id, batch_size = 16, id }) {
        return await Api.request(
            `/logs/sessions/${id}/products`,
            "GET",
            { prev_id, batch_size }
        );
    }

    static async getProductsFromCollectionsTags(tag_id, prev_id, batch_size) {
        return await Api.request("/products/collections/tags", "GET", { tag_id, prev_id, batch_size });
    }

    static async getProductsByModuleId({ prev_id, batch_size = 16, id }) {
        return await Api.request(
            `/logs/modules/${id}/products`,
            "GET",
            { prev_id, batch_size }
        );
    }

    static async getLogPriceByProductId({ prev_id, batch_size = 16, id }) {
        return await Api.request(
            `/products/${id}/prices`,
            "GET",
            { prev_id, batch_size }
        );
    }

    static async listShopPlatforms() {
        if (!Api.cache.shop_platforms)
            Api.cache.shop_platforms = (
                await Api.request("/shop-platforms")
            ).data?.platforms;

        return Api.cache.shop_platforms;
    }

    static async listShops({ prev_id, batch_size = 16, ...filters }) {
        return await Api.request(
            "/shops", "GET",
            { prev_id, batch_size, ...filters }
        );
    }

    static async fetchShopDetails({ platform, url, token, is_exporting }) {
        const data = await Api.request("/shops/details", "GET", { platform, url, token, is_exporting });
        return data;
    }

    static async getShopById(id) {
        return await Api.request("/shops/" + +id);
    }

    static async createShop({
        name,
        is_importing,
        is_exporting,
        platform,
        currency,
        url,
        original_url,
        token,
        api_secret,
        day_ranges,
        price_ranges,
        discount_values
    }) {
        return await Api.request(
            "/shops", "POST",
            {
                name,
                is_importing,
                is_exporting,
                platform,
                currency,
                url,
                original_url,
                token,
                api_secret,
                day_ranges,
                price_ranges,
                discount_values
            }
        );
    }

    static async editShop(
        id,
        { name, is_importing, is_exporting, url, token }
    ) {
        return await Api.request(
            `/shops/${+id}`, "PATCH",
            {
                name, is_importing, is_exporting,
                ...((url ?? null) === null ? {} : { url }),
                ...((token ?? null) === null ? {} : { token })
            }
        );
    }

    static async listShopAttributes(id) {
        return await Api.request(`/shops/${+id}/attributes`);
    }

    static async deleteShop(id) {
        return await Api.request("/shops/" + +id, "DELETE");
    }

    static async listShopImportedProducts({ shop_id, prev_id, batch_size = 16 }) {
        return await Api.request(
            `/shops/${+shop_id}/products/imported`, "GET",
            { prev_id, batch_size }
        );
    }

    static async listShopExportedProducts({ shop_id, prev_id, batch_size = 16 }) {
        return await Api.request(
            `/shops/${+shop_id}/products/exported`,
            "GET",
            { prev_id, batch_size }
        );
    }

    static async addShopExportedProducts(shop_id, product_ids) {
        return await Api.request(
            `/shops/${+shop_id}/products/exported`,
            "PUT",
            { product_ids }
        );
    }

    static async updateShopExportedProduct(shop_id, product_id, data) {
        return await Api.request(
            `/shops/${+shop_id}/products/exported/${+product_id}`,
            "PATCH",
            data
        );
    }

    static async removeShopExportedProducts(shop_id, product_ids) {
        return await Api.request(
            `/shops/${+shop_id}/products/exported`,
            "DELETE",
            { product_ids }
        );
    }

    static async getShopBindings(shop_id, category) {
        return await Api.request(
            `/shops/${+shop_id}/bindings/${encodeURIComponent(category)}`
        );
    }

    static async setShopBinding(
        shop_id, category, korvin_id, attribute_value_id
    ) {
        return await Api.request(
            `/shops/${+shop_id}/bindings/${encodeURIComponent(category)}/`,
            "PUT",
            { korvin_id, attribute_value_id }
        );
    }

    static async deleteShopBinding(
        shop_id, category, korvin_id, attribute_value_id
    ) {
        return await Api.request(
            `/shops/${+shop_id}/bindings/${encodeURIComponent(category)}/`,
            "DELETE",
            { korvin_id, attribute_value_id }
        );
    }

    static async launchShopSetupSession(shop_id) {
        return await Api.request(
            `/shops/${+shop_id}/setup-session`,
            "POST"
        );
    }

    static async launchShopImportSession(shop_id) {
        return await Api.request(
            `/shops/${+shop_id}/import-session`,
            "POST"
        );
    }

    static async launchShopExportSession(shop_id) {
        return await Api.request(
            `/shops/${+shop_id}/export-session`,
            "POST"
        );
    }

    static async listMarketplacePlatforms() {
        if (!Api.cache.marketplace_platforms)
            Api.cache.marketplace_platforms = (
                await Api.request("/marketplace-platforms")
            ).data?.platforms;

        return Api.cache.marketplace_platforms;
    }

    static async listMarketplaces({ prev_id, batch_size = 16, ...filters }) {
        return await Api.request(
            "/marketplaces", "GET",
            { prev_id, batch_size, ...filters }
        );
    }

    static async getMarketplaceById(id) {
        return await Api.request("/marketplaces/" + +id);
    }

    static async createMarketplace({ name, platform, ranges }) {
        return await Api.request(
            "/marketplaces",
            "POST",
            { name, platform, ranges }
        );
    }

    static async editMarketplace(id, data) {
        return await Api.request(`/marketplaces/${+id}`, "PATCH", data);
    }

    static async deleteMarketplace(id) {
        return await Api.request("/marketplaces/" + +id, "DELETE");
    }

    static async listMarketplaceExportedProducts({
        marketplace_id,
        prev_id,
        batch_size = 16
    }) {
        return await Api.request(
            `/marketplaces/${+marketplace_id}/products/exported`,
            "GET",
            { prev_id, batch_size }
        );
    }

    static async addMarketplaceExportedProducts(marketplace_id, product_ids) {
        return await Api.request(
            `/marketplaces/${+marketplace_id}/products/exported`,
            "PUT",
            { product_ids }
        );
    }

    static async updateMarketplaceExportedProduct(
        marketplace_id,
        product_id,
        data
    ) {
        return await Api.request(
            `/marketplaces/${+marketplace_id}/products/exported/${+product_id}`,
            "PATCH",
            data
        );
    }

    static async removeMarketplaceExportedProducts(
        marketplace_id,
        product_ids
    ) {
        return await Api.request(
            `/marketplaces/${+marketplace_id}/products/exported`,
            "DELETE",
            { product_ids }
        );
    }

    static async launchMarketplaceExportSession(marketplace_id) {
        return await Api.request(
            `/marketplaces/${+marketplace_id}/export-session`,
            "POST"
        );
    }

    static async signupToken() {
        return await Api.request(
            `/signup-tokens`,
            "POST"
        );
    }

    static async addProductToCart(product_id) {
        return await Api.request(
            `/carts/products/${product_id}`,
            "PUT"
        );
    }

    static async removeProductFromCart(product_id) {
        return await Api.request(
            `/carts/products/${product_id}`,
            "DELETE",
        );
    }

    static async listCartProducts({ user_id, prev_id = 0, batch_size = 32 }) {
        return await Api.request(
            `/carts/${user_id}/products`,
            "GET",
            { prev_id, batch_size }
        );
    }

    static async getUserCart(user_id) {
        return await Api.request(`/carts/${user_id}`);
    }

    static async getCartTotals({
        certificate_ids,
        shipping_type,
        country_id,
        coupon_codes
    }) {
        return await Api.request(
            `/carts/totals`,
            "GET",
            {
                certificate_ids: [...certificate_ids].join("-"),
                shipping_type,
                country_id,
                coupon_codes: [...coupon_codes].join("-")
            }
        );
    }

    static async listProductsInShareView({ hash, prev_id = 0, batch_size = 32 }) {
        return await Api.request(
            `/view/${hash}`,
            "GET",
            { prev_id, batch_size }
        );
    }

    static async getCartPayment(hash) {
        return await Api.request(`/carts/payments/${hash}`);
    }

    static async createCartPayment(data) {
        return await Api.request(`/carts/payments`, "POST", data);
    }

    static getShareViewUrl({ id, share_token }) {
        const hash = `${id}-${encodeURIComponent(share_token)}`;

        return `${window.location.origin}/view/${hash}`;
    }

    static async listStripePaymentMethods() {
        return await Api.request("/stripe/payment-methods");
    }

    static async addStripePaymentMethod() {
        return await Api.request("/stripe/payment-methods", "POST");
    }

    static async deleteStripePaymentMethod(pm_id) {
        return await Api.request(`/stripe/payment-methods/${pm_id}`, "DELETE");
    }
}
