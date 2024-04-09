const axios = require("axios");

class SlackLogger {
    static escape(str) {
        const sequences = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;"
        };

        return str.replaceAll(/&<>/g, c => sequences[c]);
    }

    /**
     * Sends a message to a Slack channel.
     * @param {Object} options - The options for sending the message.
     * @param {string} options.channel_id - The ID of the Slack channel.
     * @param {string} options.text - The text of the message.
     * @param {Object} [options.params] - Additional parameters for the message.
     * @returns {Promise} A promise that resolves with the response from Slack.
     */
    static async sendMessage({channel_id, text, params}) {
        return await axios.post(
            "https://slack.com/api/chat.postMessage",
            {channel: channel_id, text, ...params},
            {
                headers: {
                    Authorization: "Bearer " + process.env.SLACK_TOKEN
                }
            }
        );
    }
}

module.exports = SlackLogger;
