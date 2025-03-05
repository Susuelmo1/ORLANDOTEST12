
const { WebhookClient, EmbedBuilder } = require('discord.js');

// Store webhook clients
const webhookClients = new Map();

/**
 * Get or initialize a webhook client
 * @param {string} url - The webhook URL
 * @returns {WebhookClient|null} The webhook client or null if URL is invalid
 */
function getWebhookClient(url) {
  if (!url) return null;
  
  // Return existing client if already created
  if (webhookClients.has(url)) {
    return webhookClients.get(url);
  }
  
  // Create new client
  try {
    const client = new WebhookClient({ url });
    webhookClients.set(url, client);
    return client;
  } catch (error) {
    console.error('Error initializing webhook client:', error);
    return null;
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
 * @returns {Promise<void>}
 */
async function logToWebhook(options) {
  const webhook = getWebhookClient(options.webhookUrl || process.env.LOG_WEBHOOK_URL);
  if (!webhook) return;
  
  try {
    const embed = new EmbedBuilder()
      .setTitle(options.title || 'Log Event')
      .setDescription(options.description || '')
      .setColor(options.color || 0x9B59B6)
      .setTimestamp();
    
    if (options.fields && Array.isArray(options.fields)) {
      embed.addFields(...options.fields);
    }
    
    if (options.thumbnail) {
      embed.setThumbnail(options.thumbnail);
    }
    
    if (options.image) {
      embed.setImage(options.image);
    }
    
    if (options.footer) {
      embed.setFooter(options.footer);
    } else {
      embed.setFooter({ text: 'ERLC Alting Support' });
    }
    
    await webhook.send({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error('Error sending webhook log:', error);
    return false;
  }
}

/**
 * Send order logs to the order webhook
 */
async function logOrder(options) {
  return logToWebhook({
    webhookUrl: 'https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML',
    ...options
  });
}

module.exports = {
  logToWebhook,
  logOrder,
  getWebhookClient
};
