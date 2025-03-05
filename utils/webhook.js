const { WebhookClient } = require('discord.js');

/**
 * Send a message to a Discord webhook
 * @param {string} webhookUrl - The webhook URL
 * @param {Object} data - The data to send to the webhook
 * @returns {Promise<void>}
 */
async function sendWebhook(webhookUrl, data) {
  try {
    const webhook = new WebhookClient({ url: webhookUrl });
    await webhook.send(data);
  } catch (error) {
    console.error('Error sending webhook:', error);
  }
}

/**
 * Log an event to a webhook
 * @param {Object} options - Logging options
 * @param {string} options.webhookUrl - The webhook URL to send to
 * @param {string} options.title - The title of the log
 * @param {string} options.description - The description of the log
 * @param {Array} options.fields - Fields to add to the embed
 * @param {string} options.color - The color of the embed (hex code)
 * @param {string} options.thumbnail - URL for thumbnail image
 * @param {string} options.image - URL for main image
 * @param {Object} options.footer - Footer object with text property
 * @returns {Promise<boolean>}
 */
async function logToWebhook(options) {
  if (!options.webhookUrl) return false;

  try {
    const embed = {
      title: options.title || 'Log Event',
      description: options.description || '',
      color: options.color || 0x9B59B6,
      timestamp: new Date(),
      footer: options.footer || { text: 'ERLC Alting Support' },
    };

    if (options.fields && Array.isArray(options.fields)) {
      embed.fields = options.fields;
    }

    if (options.thumbnail) {
      embed.thumbnail = { url: options.thumbnail };
    }

    if (options.image) {
      embed.image = { url: options.image };
    }

    await sendWebhook(options.webhookUrl, { embeds: [embed] });
    return true;
  } catch (error) {
    console.error('Error sending webhook log:', error);
    return false;
  }
}

/**
 * Send order logs to the order webhook
 *This function is kept for backward compatibility, but using sendWebhook directly is recommended.
 */
async function logOrder(options) {
  return logToWebhook({
    webhookUrl: 'https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML',
    ...options
  });
}

module.exports = {
  sendWebhook,
  logToWebhook,
  logOrder
};