const { WebhookClient, EmbedBuilder } = require('discord.js');

/**
 * Send a message to a Discord webhook
 * @param {string} webhookUrl - The webhook URL
 * @param {Object} data - The data to send to the webhook
 * @returns {Promise<void>}
 */
async function sendWebhook(webhookUrl, data) {
  try {
    const webhook = new WebhookClient({ url: webhookUrl });
    
    // If data contains embeds, enhance them with consistent branding if they don't already have it
    if (data.embeds && Array.isArray(data.embeds)) {
      data.embeds = data.embeds.map(embed => {
        // If it's already an EmbedBuilder instance, convert to raw data
        const rawEmbed = embed instanceof EmbedBuilder ? embed.toJSON() : embed;
        
        // Set default color if not specified
        if (!rawEmbed.color) {
          rawEmbed.color = 0x9B59B6; // Purple color
        }
        
        // Set default image if not specified
        if (!rawEmbed.image && !rawEmbed.thumbnail) {
          rawEmbed.image = { 
            url: 'https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png'
          };
        }
        
        // Set default footer if not specified
        if (!rawEmbed.footer) {
          rawEmbed.footer = { text: 'ERLC Alting Support' };
        }
        
        return rawEmbed;
      });
    }
    
    await webhook.send(data);
  } catch (error) {
    console.error('Error sending webhook:', error);
  }
}

/**
 * Log an event to a webhook with enhanced styling
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
    // Create a new embed with our consistent branding
    const embed = new EmbedBuilder()
      .setTitle(options.title ? `<:purplearrow:1337594384631332885> **${options.title}**` : '<:purplearrow:1337594384631332885> **LOG EVENT**')
      .setDescription(options.description ? `***${options.description}***` : '')
      .setColor(options.color || 0x9B59B6)
      .setTimestamp()
      .setFooter({ text: options.footer?.text || 'ERLC Alting Support' });

    // Add image or thumbnail
    if (options.image) {
      embed.setImage(options.image);
    } else if (!options.thumbnail) {
      // Set default banner if neither is provided
      embed.setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png');
    }
    
    if (options.thumbnail) {
      embed.setThumbnail(options.thumbnail);
    }

    // Add fields
    if (options.fields && Array.isArray(options.fields)) {
      // Enhance field names with bold formatting if not already formatted
      const enhancedFields = options.fields.map(field => {
        if (field.name && !field.name.includes('**')) {
          return {
            ...field,
            name: `**${field.name}**`
          };
        }
        return field;
      });
      
      embed.addFields(enhancedFields);
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
 * Enhanced with consistent styling and branding
 */
async function logOrder(options) {
  return logToWebhook({
    webhookUrl: 'https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML',
    color: 0x9B59B6, // Purple color
    image: 'https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png',
    ...options
  });
}

module.exports = {
  sendWebhook,
  logToWebhook,
  logOrder
};