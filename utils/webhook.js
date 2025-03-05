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
      .setTitle(options.title ? `**@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫**\n<:purplearrow:1337594384631332885> **${options.title}**` : '**@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫**\n<:purplearrow:1337594384631332885> **LOG EVENT**')
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
 * Webhook URLs for different types of notifications
 */
const WEBHOOKS = {
  // Primary webhook for general notifications
  PRIMARY: 'https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML',

  // Order completion webhook
  ORDER_COMPLETION: 'https://discord.com/api/webhooks/1346696889101320303/WKWqJQLiN3NVSN4DRaR56PyuUZrOIHtkAvWTazqiYxSCb1ume1R5cnfQEZYEsxNOzVQp',

  // Queue updates channel webhook
  QUEUE_UPDATES: 'https://discord.com/api/webhooks/1346304963445260338/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML'
};

/**
 * Send order logs to the order webhook
 * Enhanced with consistent styling and branding
 */
async function logOrder(options) {
  return logToWebhook({
    webhookUrl: WEBHOOKS.PRIMARY,
    color: 0x9B59B6, // Purple color
    image: 'https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png',
    ...options
  });
}

/**
 * Send order completion logs to the dedicated webhook
 */
async function logOrderCompletion(options) {
  // Send to primary webhook
  await logToWebhook({
    webhookUrl: WEBHOOKS.PRIMARY,
    color: 0x9B59B6,
    image: 'https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png',
    ...options
  });

  // Send to order completion webhook
  return logToWebhook({
    webhookUrl: WEBHOOKS.ORDER_COMPLETION,
    color: 0x9B59B6,
    image: 'https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png',
    ...options
  });
}

/**
 * Send queue updates to the queue channel webhook
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

  // Send to queue updates webhook directly
  return logToWebhook({
    webhookUrl: WEBHOOKS.QUEUE_UPDATES,
    title: '**QUEUE UPDATE**',
    description: options.description || 'Queue status has been updated',
    color: 0x9B59B6,
    includeQueue: true,
    queuePosition: queuePosition,
    estimatedWaitTime: waitTimeMinutes,
    ...options
  });
}

// Log a completed order
async function logOrder(orderData) {
  try {
    const webhookUrl = process.env.ORDER_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346696889101320303/WKWqJQLiN3NVSN4DRaR56PyuUZrOIHtkAvWTazqiYxSCb1ume1R5cnfQEZYEsxNOzVQp';
    const webhook = new WebhookClient({ url: webhookUrl });

    // Create the embed from the provided data
    const embed = new EmbedBuilder()
      .setTitle(`@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫\n<:purplearrow:1337594384631332885> **${orderData.title}**`)
      .setDescription(orderData.description)
      .setColor(orderData.color || 0x9B59B6) // Use provided color or default to purple
      .setTimestamp();

    // Add fields if provided
    if (orderData.fields && Array.isArray(orderData.fields)) {
      orderData.fields.forEach(field => {
        embed.addFields({ 
          name: field.name, 
          value: field.value, 
          inline: field.inline !== undefined ? field.inline : false 
        });
      });
    }

    // Add image if provided
    if (orderData.image) {
      embed.setImage(orderData.image);
    } else {
      embed.setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png');
    }

    // Send the webhook
    await webhook.send({ 
      content: orderData.content || '',
      embeds: [embed] 
    });

    return true;
  } catch (error) {
    console.error('Error sending order webhook:', error);
    return false;
  }
}

module.exports = {
  sendWebhook,
  logToWebhook,
  logOrder,
  logOrderCompletion,
  updateQueueStatus,
  WEBHOOKS
};