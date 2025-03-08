const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, Collection } = require('discord.js');
const crypto = require('crypto');

// Queue system
const queue = new Collection();
let nextQueueNumber = 50;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderproof')
    .setDescription('Submit proof of your order')
    .addStringOption(option =>
      option.setName('roblox_username')
        .setDescription('Your Roblox username')
        .setRequired(true))
    .addAttachmentOption(option =>
      option.setName('screenshot')
        .setDescription('Screenshot of your purchase proof')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('package')
        .setDescription('The package you purchased')
        .setRequired(true)
        .addChoices(
          { name: '10 Bots', value: '10_bots' },
          { name: '15 Bots', value: '15_bots' },
          { name: '20 Bots', value: '20_bots' },
          { name: '25 Bots', value: '25_bots' },
          { name: '30 Bots', value: '30_bots' },
          { name: '40 Bots', value: '40_bots' },
          { name: 'Full Server', value: 'full_server' },
          { name: 'Refill', value: 'refill' },
          { name: 'Week VIP', value: 'week_vip' },
          { name: 'Month VIP', value: 'month_vip' },
          { name: 'Lifetime VIP', value: 'lifetime_vip' }
        )),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // Allow the command to be used in any channel
      // Exclude specific channels where we don't want this command used
      const blockedChannelIds = ['1337553581250838639', '1337553699714760837', '1337592519462096927', '1346305973622673478'];
      if (blockedChannelIds.includes(interaction.channel.id)) {
        return interaction.editReply('❌ This command cannot be used in this channel!');
      }

      const robloxUsername = interaction.options.getString('roblox_username');
      const screenshot = interaction.options.getAttachment('screenshot');
      const package = interaction.options.getString('package');

      // Validate the screenshot
      if (!screenshot.contentType.startsWith('image/')) {
        return interaction.editReply('❌ Please provide a valid image for your screenshot!');
      }

      // Get the package details
      let packageName = '';
      let packageDuration = '';
      let expirationDays = 1;

      switch (package) {
        case '10_bots':
          packageName = '10 Bots';
          packageDuration = '1 day';
          expirationDays = 1;
          break;
        case '15_bots':
          packageName = '15 Bots';
          packageDuration = '1 day';
          expirationDays = 1;
          break;
        case '20_bots':
          packageName = '20 Bots';
          packageDuration = '1 day';
          expirationDays = 1;
          break;
        case '25_bots':
          packageName = '25 Bots';
          packageDuration = '1 day';
          expirationDays = 1;
          break;
        case '30_bots':
          packageName = '30 Bots';
          packageDuration = '1 day';
          expirationDays = 1;
          break;
        case '40_bots':
          packageName = '40 Bots';
          packageDuration = '1 day';
          expirationDays = 1;
          break;
        case 'full_server':
          packageName = 'Full Server';
          packageDuration = '1 day';
          expirationDays = 1;
          break;
        case 'refill':
          packageName = 'Refill';
          packageDuration = '1 day';
          expirationDays = 1;
          break;
        case 'week_vip':
          packageName = 'Week VIP';
          packageDuration = '7 days';
          expirationDays = 7;
          break;
        case 'month_vip':
          packageName = 'Month VIP';
          packageDuration = '30 days';
          expirationDays = 30;
          break;
        case 'lifetime_vip':
          packageName = 'Lifetime VIP';
          packageDuration = 'Lifetime';
          expirationDays = 36500; // ~100 years
          break;
        default:
          packageName = 'Unknown Package';
          packageDuration = 'Unknown';
          expirationDays = 1;
      }

      // Generate a unique order ID
      const orderId = crypto.randomBytes(4).toString('hex').toUpperCase();

      // Add to queue
      const queueNumber = nextQueueNumber++;
      queue.set(interaction.user.id, { robloxUsername, queueNumber });

      // Store the order proof details for later use
      if (!client.orderProofs) {
        client.orderProofs = new Map();
      }

      // Store order details with expiration date
      const expirationDate = new Date();
      if (packageDuration === 'Lifetime') {
        expirationDate.setFullYear(expirationDate.getFullYear() + 100); // Essentially lifetime
      } else if (packageDuration === '30 days') {
        expirationDate.setDate(expirationDate.getDate() + 30);
      } else if (packageDuration === '7 days') {
        expirationDate.setDate(expirationDate.getDate() + 7);
      } else {
        expirationDate.setDate(expirationDate.getDate() + 1); // Default to 1 day
      }

      // Format expiration date for display
      const formattedExpiration = expirationDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      client.orderProofs.set(orderId, {
        userId: interaction.user.id,
        robloxUsername,
        screenshotUrl: screenshot.url,
        package: packageName,
        duration: packageDuration,
        timestamp: new Date(),
        queueNumber,
        expirationDate: expirationDate,
        expirationDays: expirationDays
      });

      // Create a professional embed for the order proof
      const orderProofEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **ORDER PROOF SUBMITTED**')
        .setDescription(`***Order proof has been successfully submitted!***`)
        .addFields(
          { name: '**Roblox Username**', value: `\`${robloxUsername}\``, inline: true },
          { name: '**Package**', value: `\`${packageName}\``, inline: true },
          { name: '**Duration**', value: `\`${packageDuration}\``, inline: true },
          { name: '**Expires On**', value: `\`${formattedExpiration}\``, inline: true },
          { name: '**Order ID**', value: `\`${orderId}\``, inline: false },
          { name: '**<:PurpleLine:1336946927282950165> Next Steps**', value: `A staff member will verify your proof and generate your key using \`/generatekey\`.` }
        )
        .setColor(0x9B59B6) 
        .setThumbnail(screenshot.url)
        .setTimestamp();

      // Ping staff for attention
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';

      await interaction.editReply({
        content: `<@&${staffRoleId}> New order proof submitted! Order ID: \`${orderId}\``,
        embeds: [orderProofEmbed]
      });

      // Add prominent title for orderproof
      await interaction.channel.send('# **📝 ORDER PROOF SUBMISSION**');

      // Instructions for key usage - with much clearer formatting
      const keyInstructionsEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **NEXT STEPS**')
        .setDescription('***After your order is verified, follow these steps:***')
        .addFields(
          { 
            name: '**1️⃣ WAIT FOR KEY GENERATION**', 
            value: '> A staff member will generate a unique key for you.\n> This may take a few minutes depending on staff availability.' 
          },
          { 
            name: '**2️⃣ RECEIVE YOUR KEY**', 
            value: '> You\'ll receive your key via DM or in this ticket.\n> ⚠️ **KEEP THIS KEY CONFIDENTIAL - DO NOT SHARE IT!**' 
          },
          { 
            name: '**3️⃣ ORDER ACTIVATION**', 
            value: '> Staff will activate your order using your key.\n> You\'ll receive the Alting Customer role automatically.' 
          },
          { 
            name: '**💡 NEED TO ADD A FRIEND?**', 
            value: '> You can add up to 3 friends to your ticket using:\n> **`/add @username`**\n> They\'ll be able to see and participate in this ticket.' 
          }
        )
        .setColor(0x9B59B6)
        .setTimestamp();

      await interaction.channel.send({ embeds: [keyInstructionsEmbed] });


      // Log to a webhook
      try {
        const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
        const { WebhookClient } = require('discord.js');
        const webhook = new WebhookClient({ url: webhookUrl });

        const logEmbed = new EmbedBuilder()
          .setTitle('<:alting:1336938112261029978> **ORDER PROOF SUBMITTED**')
          .setDescription(`Order proof submitted by ${interaction.user.tag}`)
          .addFields(
            { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Roblox Username', value: robloxUsername, inline: true },
            { name: 'Package', value: packageName, inline: true },
            { name: 'Duration', value: packageDuration, inline: true },
            { name: 'Expires On', value: formattedExpiration, inline: true },
            { name: 'Order ID', value: orderId, inline: false },
            { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: false },
            { name: 'Queue Position', value: `${queueNumber}`, inline: false}
          )
          .setColor(0x9B59B6)
          .setThumbnail(screenshot.url)
          .setTimestamp();

        await webhook.send({ embeds: [logEmbed] });
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }

      // Send notification to order list channel
      try {
        const orderListChannelId = '1347749924611293184';
        const orderListChannel = client.channels.cache.get(orderListChannelId);
        if (orderListChannel) {
          const orderListEmbed = new EmbedBuilder()
            .setTitle('<:alting:1336938112261029978> **ORDER PROOF SUBMITTED**')
            .setDescription(`Order proof submitted by ${interaction.user.tag}`)
            .addFields(
              { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Roblox Username', value: robloxUsername, inline: true },
              { name: 'Package', value: packageName, inline: true },
              { name: 'Duration', value: packageDuration, inline: true },
              { name: 'Expires On', value: formattedExpiration, inline: true },
              { name: 'Order ID', value: orderId, inline: true },
              { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true },
              { name: 'Queue Position', value: `${queueNumber}`, inline: true }
            )
            .setColor(0x9B59B6)
            .setThumbnail(screenshot.url)
            .setTimestamp();
          await orderListChannel.send({ embeds: [orderListEmbed] });
        }
      } catch (channelError) {
        console.error('Error sending to order list channel:', channelError);
      }

    } catch (error) {
      console.error('Error with orderproof command:', error);
      await interaction.editReply('❌ There was an error submitting your order proof! Please try again or contact a staff member.');
    }
  }
};