import Permissions from "./Permissions.js";

export default class User {
    constructor(data) {
        this.id = +data.id;
        this.username = data.username;
        this.firstName = data.first_name;
        this.lastName = data.last_name;
        this.email = data.email;
        this.phone = data.phone || null;
        this.addressStreet = data.address_street;
        this.addressCity = data.address_city;
        this.addressZip = data.address_zip;
        this.addressCountryId = data.address_country_id;
        this.companyName = data.company_name;
        this.companyVat = data.company_vat || null;
        this.url = data.url || null;
        this.instagram = data.instagram || null;
        this.tiktok = data.tiktok || null;
        this.facebook = data.facebook || null;
        this.linkedin = data.linkedin || null;
        this.permissions = new Permissions(data.permissions || []);
        this.certificates = data.certificates || [];
    }

    serialize() {
        return {
            id: this.id,
            username: this.username,
            first_name: this.firstName,
            last_name: this.lastName,
            email: this.email,
            phone: this.phone,
            address: {
                street: this.addressStreet,
                city: this.addressCity,
                zip: this.addressZip,
                country_id: this.addressCountryId
            },
            company_name: this.companyName,
            company_vat: this.companyVat,
            url: this.url,
            instagram: this.instagram,
            tiktok: this.tiktok,
            facebook: this.facebook,
            linkedin: this.linkedin,
            permissions: this.permissions.serialize(),
            certificates: this.certificates
        };
    }
}
