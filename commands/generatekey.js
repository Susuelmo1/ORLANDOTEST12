
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
          { name: 'Daily (1 day)', value: 'daily' },
          { name: 'Day 2', value: 'day_2' },
          { name: 'Day 3', value: 'day_3' },
          { name: 'Day 4', value: 'day_4' },
          { name: 'Day 5', value: 'day_5' },
          { name: 'Day 6', value: 'day_6' },
          { name: 'Day 7', value: 'day_7' },
          { name: 'Week (7 days)', value: 'week_vip' },
          { name: '2 Weeks (14 days)', value: 'two_weeks' },
          { name: 'Month (30 days)', value: 'month_vip' },
          { name: 'Lifetime VIP', value: 'lifetime_vip' }
        ))
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to generate a key for')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('orderid')
        .setDescription('The Order ID from orderproof')
        .setRequired(true)),

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

      // Check if order ID exists
      if (!client.orderProofs || !client.orderProofs.has(orderId)) {
        return interaction.editReply(`❌ Order ID \`${orderId}\` not found! Make sure the user has submitted order proof first.`);
      }

      // Define expiration period based on package
      let expirationDays = 1; // Default to 1 day
      let packageName = 'Daily';
      
      switch (package) {
        case 'daily':
          expirationDays = 1;
          packageName = 'Daily (1 day)';
          break;
        case 'day_2':
          expirationDays = 2;
          packageName = 'Day 2';
          break;
        case 'day_3':
          expirationDays = 3;
          packageName = 'Day 3';
          break;
        case 'day_4':
          expirationDays = 4;
          packageName = 'Day 4';
          break;
        case 'day_5':
          expirationDays = 5;
          packageName = 'Day 5';
          break;
        case 'day_6':
          expirationDays = 6;
          packageName = 'Day 6';
          break;
        case 'day_7':
          expirationDays = 7;
          packageName = 'Day 7';
          break;
        case 'week_vip':
          expirationDays = 7;
          packageName = 'Week VIP';
          break;
        case 'two_weeks':
          expirationDays = 14;
          packageName = '2 Weeks';
          break;
        case 'month_vip':
          expirationDays = 30;
          packageName = 'Month VIP';
          break;
        case 'lifetime_vip':
          expirationDays = 36500; // ~100 years, essentially lifetime
          packageName = 'Lifetime VIP';
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
      
      global.generatedKeys.set(key, {
        userId: user.id,
        package: packageName,
        orderId: orderId,
        generatedBy: interaction.user.id,
        generatedAt: new Date(),
        expirationDate: expirationDate,
        used: false
      });

      // Create beautiful embed for staff
      const staffEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **KEY GENERATED**')
        .setDescription(`***A key has been generated for ${user}***`)
        .addFields(
          { name: '**Package**', value: `\`${packageName}\``, inline: true },
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Expires**', value: `\`${formattedExpiration}\``, inline: true },
          { name: '**Key**', value: `\`${key}\``, inline: false },
          { name: '**<:PurpleLine:1336946927282950165> Next Steps**', value: `Use \`/orderstart\` to activate this key for the user.` }
        )
        .setColor(0x9B59B6)
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setFooter({ text: 'ERLC Alting Support' })
        .setTimestamp();

      // Send key details to staff
      await interaction.editReply({ embeds: [staffEmbed] });

      // Try to DM user about their key
      try {
        const userEmbed = new EmbedBuilder()
          .setTitle('<:purplearrow:1337594384631332885> **YOUR KEY IS READY**')
          .setDescription(`***Your ${packageName} key has been generated!***`)
          .addFields(
            { name: '**Key**', value: `\`${key}\``, inline: false },
            { name: '**Expires**', value: `\`${formattedExpiration}\``, inline: true },
            { name: '**<:PurpleLine:1336946927282950165> Important**', value: `__***Do not share this key with anyone!***__\nThis key is tied to your account and using it gives access to our services.` }
          )
          .setColor(0x9B59B6)
          .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
          .setFooter({ text: 'ERLC Alting Support' })
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

      // Log to a webhook if configured
      try {
        if (process.env.LOG_WEBHOOK_URL) {
          const { WebhookClient } = require('discord.js');
          const webhook = new WebhookClient({ url: process.env.LOG_WEBHOOK_URL });
          
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
              { name: 'Key', value: `\`||${key}||\``, inline: false },
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
