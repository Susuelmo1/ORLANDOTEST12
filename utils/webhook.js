
const { WebhookClient, EmbedBuilder } = require('discord.js');

// Create a singleton webhook instance
let webhookClient = null;

/**
 * Get or initialize the webhook client
 * @returns {WebhookClient|null} The webhook client or null if URL is not set
 */
function getWebhookClient() {
  if (webhookClient) return webhookClient;
  
  const webhookUrl = process.env.LOG_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      webhookClient = new WebhookClient({ url: webhookUrl });
      return webhookClient;
    } catch (error) {
      console.error('Error initializing webhook client:', error);
      return null;
    }
  }
  return null;
}

/**
 * Log an event to the webhook
 * @param {Object} options - Logging options
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
  const webhook = getWebhookClient();
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
  } catch (error) {
    console.error('Error sending webhook log:', error);
  }
}

module.exports = {
  logToWebhook
};
