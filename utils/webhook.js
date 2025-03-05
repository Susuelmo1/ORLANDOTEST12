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
        
        // Check if this is a product selection embed and add PayPal info
        if (rawEmbed.title && rawEmbed.title.includes('PRODUCT SELECTED')) {
          // Add PayPal emoji to price field if it exists
          const priceField = rawEmbed.fields?.find(field => field.name === '**Price**');
          if (priceField) {
            priceField.value = `<:PAYPAL:1337607920447131769> ${priceField.value}`;
          }
          
          // Replace "Next Steps" field if it exists
          const nextStepsIndex = rawEmbed.fields?.findIndex(field => field.name === '**Next Steps**');
          if (nextStepsIndex !== -1 && nextStepsIndex !== undefined) {
            rawEmbed.fields[nextStepsIndex] = {
              name: '**<:PurpleLine:1336946927282950165> Payment**',
              value: '**Please complete your purchase and use `/orderproof` to submit your order details.**'
            };
          }
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
 * @param {boolean} options.includeQueue - Whether to include queue information (default: false)
 * @param {number} options.queuePosition - Position in queue (if includeQueue is true)
 * @param {number} options.estimatedWaitTime - Estimated wait time in minutes (if includeQueue is true)
 * @returns {Promise<boolean>}
 */
async function logToWebhook(options) {
  if (!options.webhookUrl) return false;

  try {
    // Create a new embed with our consistent branding
    const embed = new EmbedBuilder()
      .setTitle(options.title ? `@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫\n<:purplearrow:1337594384631332885> **${options.title}**` : '@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫\n<:purplearrow:1337594384631332885> **LOG EVENT**')
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

    // Add queue information if requested
    if (options.includeQueue) {
      const queuePosition = options.queuePosition || 1;
      const waitTime = options.estimatedWaitTime || (queuePosition * 2);
      
      embed.addFields({
        name: '**Queue Position**',
        value: `Your order is #${queuePosition} in queue. Estimated wait: ${waitTime} minutes.`,
        inline: false
      });
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

/**
 * Send queue updates to the order webhook
 * Tracks position and estimated wait time
 */
async function updateQueueStatus(options) {
  // Calculate current queue position and wait time
  let queuePosition = 1;
  let waitTimeMinutes = 5;
  
  if (global.activeOrders) {
    queuePosition = global.activeOrders.size + 1;
    waitTimeMinutes = queuePosition * 2; // Assume average 2 minutes per order
  }
  
  // Override with provided values if any
  if (options.position) queuePosition = options.position;
  if (options.waitTime) waitTimeMinutes = options.waitTime;
  
  return logOrder({
    includeQueue: true,
    queuePosition: queuePosition,
    estimatedWaitTime: waitTimeMinutes,
    ...options
  });
}

module.exports = {
  sendWebhook,
  logToWebhook,
  logOrder,
  updateQueueStatus
};