const { SlashCommandBuilder, EmbedBuilder, WebhookClient } = require('discord.js');
const crypto = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generatekey')
    .setDescription('Generate a key for a user')
    .addStringOption(option => 
      option.setName('package')
        .setDescription('The package type')
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
        ))
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to generate a key for')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('orderid')
        .setDescription('The Order ID from orderproof')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('queue_position')
        .setDescription('Position in queue (optional)')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('wait_time')
        .setDescription('Estimated wait time in minutes (optional)')
        .setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Check if user has staff role
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      const isOwner = ownersIds.includes(interaction.user.id);

      if (!isStaff && !isOwner) {
        return interaction.editReply('❌ Only staff members can use this command!');
      }

      const package = interaction.options.getString('package');
      const user = interaction.options.getUser('user');
      const orderId = interaction.options.getString('orderid');

      // Check if client.orderProofs exists
      if (!client.orderProofs) {
        client.orderProofs = new Map();
      }
      
      // Check if order ID exists (case-insensitive matching)
      let orderFound = false;
      let correctOrderId = '';
      
      if (client.orderProofs) {
        for (const [key, value] of client.orderProofs.entries()) {
          if (key.toUpperCase() === orderId.toUpperCase()) {
            orderFound = true;
            correctOrderId = key;
            break;
          }
        }
      }
      
      if (!orderFound) {
        return interaction.editReply(`❌ Order ID \`${orderId}\` not found! Make sure the user has submitted order proof first.`);
      }
      
      // Use the correct case for further processing
      orderId = correctOrderId;

      // Define expiration period based on package
      let expirationDays = 1; // Default to 1 day
      let packageName = '';

      switch (package) {
        case '10_bots':
          expirationDays = 1;
          packageName = '10 Bots';
          break;
        case '15_bots':
          expirationDays = 1;
          packageName = '15 Bots';
          break;
        case '20_bots':
          expirationDays = 1;
          packageName = '20 Bots';
          break;
        case '25_bots':
          expirationDays = 1;
          packageName = '25 Bots';
          break;
        case '30_bots':
          expirationDays = 1;
          packageName = '30 Bots';
          break;
        case '40_bots':
          expirationDays = 1;
          packageName = '40 Bots';
          break;
        case 'full_server':
          expirationDays = 1;
          packageName = 'Full Server';
          break;
        case 'refill':
          expirationDays = 1;
          packageName = 'Refill';
          break;
        case 'week_vip':
          expirationDays = 7;
          packageName = 'Week VIP';
          break;
        case 'month_vip':
          expirationDays = 30;
          packageName = 'Month VIP';
          break;
        case 'lifetime_vip':
          expirationDays = 36500; // ~100 years, essentially lifetime
          packageName = 'Lifetime VIP';
          break;
        default:
          expirationDays = 1;
          packageName = 'Unknown Package';
          break;
      }

      // Generate a unique key
      const key = crypto.randomBytes(16).toString('hex').toUpperCase();

      // Set expiration date
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expirationDays);

      // Format expiration date for display
      const formattedExpiration = expirationDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      // Store key details globally (in a real app, this would be in a database)
      if (!global.generatedKeys) {
        global.generatedKeys = new Map();
      }

      // Track usage history for this user
      if (!global.userOrderHistory) {
        global.userOrderHistory = new Map();
      }

      const orderHistory = global.userOrderHistory.get(user.id) || [];
      orderHistory.push({
        orderId: orderId,
        package: packageName,
        key: key,
        generatedAt: new Date(),
        expirationDate: expirationDate,
        generatedBy: interaction.user.id
      });
      global.userOrderHistory.set(user.id, orderHistory);

      global.generatedKeys.set(key, {
        userId: user.id,
        package: packageName,
        orderId: orderId,
        generatedBy: interaction.user.id,
        generatedAt: new Date(),
        expirationDate: expirationDate,
        duration: `${expirationDays} days`,
        used: false
      });

      // Calculate queue position and estimated time based on active orders
      let queuePosition = 1;
      let estimatedWaitMinutes = 5; // Default wait time

      if (global.activeOrders) {
        queuePosition = global.activeOrders.size + 1;
        estimatedWaitMinutes = queuePosition * 2; // Assume 2 minutes per order
      }

      // Adjust queue position from command options if provided
      const queuePositionOption = interaction.options.getInteger('queue_position');
      const waitTimeOption = interaction.options.getInteger('wait_time');

      if (queuePositionOption && queuePositionOption > 0) {
        queuePosition = queuePositionOption;
      }

      if (waitTimeOption && waitTimeOption > 0) {
        estimatedWaitMinutes = waitTimeOption;
      }

      // Create beautiful embed for staff
      const staffEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **KEY GENERATED**')
        .setDescription(`***A key has been generated for ${user}***`)
        .addFields(
          { name: '**Package**', value: `\`${packageName}\``, inline: true },
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Duration**', value: `\`${expirationDays} days\``, inline: true },
          { name: '**Expires**', value: `\`${formattedExpiration}\``, inline: true },
          { name: '**Key**', value: `||**\`${key}\`**|| (ID: \`${orderId}\`)`, inline: false },
          { name: '**Estimated Time**', value: `Based on current queue, your service will be ready in approximately ${estimatedWaitMinutes} minutes.`, inline: false },
          { name: '**<:PurpleLine:1336946927282950165> Next Steps**', value: `Use \`/orderstart\` to activate this key for the user.` }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png');

      // Send key details to staff
      await interaction.editReply({ embeds: [staffEmbed] });

      // Try to DM user about their key
      try {
        const userEmbed = new EmbedBuilder()
          .setTitle('<:purplearrow:1337594384631332885> **YOUR KEY IS READY**')
          .setDescription(`***Your ${packageName} key has been generated!***`)
          .addFields(
            { name: '**Key**', value: `||**\`${key}\`**||`, inline: false },
            { name: '**Duration**', value: `\`${expirationDays} days\``, inline: true },
            { name: '**Expires**', value: `\`${formattedExpiration}\``, inline: true },
            { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
            { name: '**<:PurpleLine:1336946927282950165> Important**', value: `__***Do not share this key with anyone!***__\nThis key is tied to your account and using it gives access to our services.` }
          )
          .setColor(0x9B59B6)
          .setTimestamp();

        await user.send({ embeds: [userEmbed] });

        // Let staff know that DM was sent
        await interaction.followUp({ 
          content: `✅ Key has been DMed to ${user}!`, 
          ephemeral: true 
        });
      } catch (dmError) {
        console.error('Could not send DM to user:', dmError);
        await interaction.followUp({ 
          content: `⚠️ Could not DM the key to ${user}. Their DMs may be closed.`, 
          ephemeral: true 
        });
      }

      // Log to a webhook
      try {
        const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
        const webhook = new WebhookClient({ url: webhookUrl });

        // Get order details for more comprehensive logging
        const orderDetails = client.orderProofs.get(orderId);
        const robloxUsername = orderDetails ? orderDetails.robloxUsername : 'Unknown';

        const logEmbed = new EmbedBuilder()
          .setTitle('<:alting:1336938112261029978> **KEY GENERATED**')
          .setDescription(`A key has been generated by ${interaction.user.tag}`)
          .addFields(
            { name: 'Generated For', value: `${user.tag} (<@${user.id}>)`, inline: true },
            { name: 'Roblox Username', value: `\`${robloxUsername}\``, inline: true },
            { name: 'Package', value: `\`${packageName}\``, inline: true },
            { name: 'Order ID', value: `\`${orderId}\``, inline: true },
            { name: 'Duration', value: `\`${expirationDays} days\``, inline: true },
            { name: 'Key', value: `||**\`${key}\`**||`, inline: false },
            { name: 'Expires', value: `\`${formattedExpiration}\``, inline: true },
            { name: 'Status', value: '`✅ Active`', inline: true }
          )
          .setColor(0x9B59B6)
          .setTimestamp();

        // Add screenshot if available
        if (orderDetails && orderDetails.screenshotUrl) {
          logEmbed.setThumbnail(orderDetails.screenshotUrl);
        }

        await webhook.send({ embeds: [logEmbed] });

        // Send queue status to the specific channel
        const queueChannel = await client.channels.fetch('1346304963445260338').catch(console.error);
        if (queueChannel) {
          const queueEmbed = new EmbedBuilder()
            .setTitle('<:purplearrow:1337594384631332885> **QUEUE UPDATE**')
            .setDescription(`***A new key has been generated for ${user.tag}***`)
            .addFields(
              { name: '**Queue Position**', value: `#${queuePosition}`, inline: true },
              { name: '**Estimated Wait Time**', value: `${estimatedWaitMinutes} minutes`, inline: true },
              { name: '**Package**', value: `\`${packageName}\``, inline: true },
              { name: '**Order ID**', value: `\`${orderId}\``, inline: true }
            )
            .setColor(0x9B59B6)
            .setTimestamp()
            .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png');

          await queueChannel.send({ embeds: [queueEmbed] });
        }
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }

    } catch (error) {
      console.error('Error generating key:', error);
      await interaction.editReply('❌ There was an error generating the key! Please try again.');
    }
  }
};

async function sendWebhook(url, data) {
  try {
    const webhook = new WebhookClient({ url });
    await webhook.send(data);
  } catch (error) {
    console.error('Error sending to webhook:', error);
  }
}