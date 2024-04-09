const fs = require("fs");
const path = require("path");

const nodemailer = require("nodemailer");

class Mailer {
    static TEMPLATE_DIR = path.join(__dirname, "../../emails");

    static EMAIL = process.env.EMAIL_USER;

    static transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        auth: {
            type: "OAuth2",
            user: Mailer.EMAIL,
            clientId: process.env.EMAIL_OAUTH_CLIENT_ID,
            clientSecret: process.env.EMAIL_OAUTH_CLIENT_SECRET,
            refreshToken: process.env.EMAIL_OAUTH_REFRESH_TOKEN
        }
    });

    static async readTemplateFile(template_id, file) {
        const filepath = path.join(Mailer.TEMPLATE_DIR, template_id, file);

        try {
            return "" + (await fs.promises.readFile(filepath));
        } catch (err) {
            return null;
        }
    }

    static replaceVariables(body, vars) {
        return body.replace(
            /\$[A-Z][A-Z0-9_]*/g,
            name => vars[name.substring(1).toLocaleLowerCase()] || ""
        );
    }

    static async sendMail({template_id, to, variables}) {
        const options = JSON.parse(await Mailer.readTemplateFile(
            template_id, "options.json"
        ));

        if (!options)
            throw Error(`Invalid email template: ${template_id}`);

        const body = await Mailer.readTemplateFile(
            template_id,
            options.type == "html" ? "body.html" : "body.txt"
        );

        console.info(
            `Sending email ${template_id} to ${to} with `
            + `variables: ${JSON.stringify(variables)}`
        );

        return await Mailer.transporter.sendMail({
            from: options.from || Mailer.EMAIL,
            to: to,
            subject: options.subject,
            [options.type == "html" ? "html" : "text"]:
                Mailer.replaceVariables(body, variables),
            priority: options.priority || "normal"
        });
    }
}

module.exports = Mailer;
