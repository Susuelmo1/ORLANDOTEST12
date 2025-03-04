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
      // Check if in a ticket channel
      if (!interaction.channel.name.includes('ticket')) {
        return interaction.editReply('❌ This command can only be used in a ticket channel!');
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

      switch (package) {
        case '10_bots':
          packageName = '10 Bots';
          packageDuration = '1 day';
          break;
        case '15_bots':
          packageName = '15 Bots';
          packageDuration = '1 day';
          break;
        case '20_bots':
          packageName = '20 Bots';
          packageDuration = '1 day';
          break;
        case '25_bots':
          packageName = '25 Bots';
          packageDuration = '1 day';
          break;
        case '30_bots':
          packageName = '30 Bots';
          packageDuration = '1 day';
          break;
        case '40_bots':
          packageName = '40 Bots';
          packageDuration = '1 day';
          break;
        case 'full_server':
          packageName = 'Full Server';
          packageDuration = '1 day';
          break;
        case 'refill':
          packageName = 'Refill';
          packageDuration = '1 day';
          break;
        case 'week_vip':
          packageName = 'Week VIP';
          packageDuration = '7 days';
          break;
        case 'month_vip':
          packageName = 'Month VIP';
          packageDuration = '30 days';
          break;
        case 'lifetime_vip':
          packageName = 'Lifetime VIP';
          packageDuration = 'Lifetime';
          break;
        default:
          packageName = 'Unknown Package';
          packageDuration = 'Unknown';
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

      client.orderProofs.set(orderId, {
        userId: interaction.user.id,
        robloxUsername,
        screenshotUrl: screenshot.url,
        package: packageName,
        duration: packageDuration,
        timestamp: new Date(),
        queueNumber
      });

      // Create a professional embed for the order proof
      const orderProofEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **ORDER PROOF SUBMITTED**')
        .setDescription(`***Order proof has been successfully submitted!***`)
        .addFields(
          { name: '**Roblox Username**', value: `\`${robloxUsername}\``, inline: true },
          { name: '**Package**', value: `\`${packageName}\``, inline: true },
          { name: '**Duration**', value: `\`${packageDuration}\``, inline: true },
          { name: '**Order ID**', value: `\`${orderId}\``, inline: false },
          { name: '**Queue Position**', value: `\`${queueNumber}\``, inline: false },
          { name: '**<:PurpleLine:1336946927282950165> Next Steps**', value: `A staff member will verify your proof and provide your key.  Type /PAYMENT when ready to pay.` }
        )
        .setColor(0x9B59B6) 
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setThumbnail(screenshot.url)
        .setFooter({ text: 'ERLC Alting Support' })
        .setTimestamp();

      // Ping staff for attention
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';

      await interaction.editReply({
        content: `<@&${staffRoleId}> New order proof submitted! Order ID: \`${orderId}\``,
        embeds: [orderProofEmbed]
      });

      // Log to a webhook if configured
      try {
        if (process.env.LOG_WEBHOOK_URL) {
          const { WebhookClient } = require('discord.js');
          const webhook = new WebhookClient({ url: process.env.LOG_WEBHOOK_URL });

          const logEmbed = new EmbedBuilder()
            .setTitle('New Order Proof Submitted')
            .setDescription(`Order proof submitted by ${interaction.user.tag}`)
            .addFields(
              { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Roblox Username', value: robloxUsername, inline: true },
              { name: 'Package', value: packageName, inline: true },
              { name: 'Order ID', value: orderId, inline: false },
              { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: false },
              { name: 'Queue Position', value: `${queueNumber}`, inline: false}
            )
            .setColor(0x9B59B6)
            .setThumbnail(screenshot.url)
            .setTimestamp();

          await webhook.send({ embeds: [logEmbed] });
        }
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }

    } catch (error) {
      console.error('Error with orderproof command:', error);
      await interaction.editReply('❌ There was an error submitting your order proof! Please try again or contact a staff member.');
    }
  }
};


// /PAYMENT command
module.exports = {
  data: new SlashCommandBuilder()
    .setName('payment')
    .setDescription('Request payment instructions'),
  async execute(interaction) {
    await interaction.reply({ content: 'Please wait for a staff member to provide payment instructions.', ephemeral: true });
  }
};