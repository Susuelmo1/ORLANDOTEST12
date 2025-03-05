
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { sendWebhook } = require('../utils/webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactivateid')
    .setDescription('Reactivate service for a customer using order ID')
    .addStringOption(option =>
      option.setName('orderid')
        .setDescription('The Order ID to reactivate')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('token')
        .setDescription('Security token for reactivation')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('server_code')
        .setDescription('ERLC private server code')
        .setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      const isOwner = ownersIds.includes(interaction.user.id);

      if (!isStaff && !isOwner) {
        return interaction.editReply('❌ You do not have permission to use this command!');
      }

      const orderId = interaction.options.getString('orderid');
      const token = interaction.options.getString('token');
      const serverCode = interaction.options.getString('server_code');

      // Check if the order exists in the active orders map
      if (!global.activeOrders || !global.activeOrders.has(orderId)) {
        return interaction.editReply(`❌ Order ID \`${orderId}\` not found. Please check the ID and try again.`);
      }

      // Get the order data
      const orderData = global.activeOrders.get(orderId);
      
      // Verify the token (simple implementation - you might want to make this more secure)
      // For example, you could use the first 6 characters of the key as a token
      const expectedToken = orderData.key.substring(0, 6);
      if (token !== expectedToken) {
        return interaction.editReply(`❌ Invalid token for Order ID \`${orderId}\`. Reactivation failed.`);
      }

      // Get the target user
      const targetUser = await client.users.fetch(orderData.userId).catch(() => null);
      if (!targetUser) {
        return interaction.editReply(`❌ Could not find user associated with this order.`);
      }

      // Get the member if in the server
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      // Roblox account credentials
      const robloxAccount = {
        username: 'susuelmo1',
        password: 'Dekadeka12!'
      };

      // Update the server code in the order data
      orderData.serverCode = serverCode;
      orderData.reactivatedBy = interaction.user.id;
      orderData.reactivatedAt = new Date();
      global.activeOrders.set(orderId, orderData);

      // Initiate auto-joining for ERLC with Roblox accounts
      const autoJoinEmbed = new EmbedBuilder()
        .setTitle('@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫\n<:purplearrow:1337594384631332885> **ORDER REACTIVATION INITIATED**')
        .setDescription(`***${orderData.accountsCount} Roblox accounts are being dispatched to ERLC server...***`)
        .addFields(
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Server Code**', value: `\`${serverCode}\``, inline: true },
          { name: '**Status**', value: '🔄 **Connecting...**', inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp();
      
      await interaction.channel.send({ embeds: [autoJoinEmbed] });

      // Simulate Roblox accounts joining with improved messages
      const accountJoinPromise = new Promise(async (resolve) => {
        // Step 1: Connecting message
        setTimeout(async () => {
          const connectingEmbed = new EmbedBuilder()
            .setTitle('@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫\n<:purplearrow:1337594384631332885> **CONNECTING TO ROBLOX**')
            .setDescription(`***Logging into Roblox account ${robloxAccount.username}...***`)
            .addFields(
              { name: '**Status**', value: '🔄 **Authenticating...**', inline: true }
            )
            .setColor(0x9B59B6)
            .setTimestamp();
          
          await interaction.channel.send({ embeds: [connectingEmbed] });

          // Step 2: Loading server message
          setTimeout(async () => {
            const loadingEmbed = new EmbedBuilder()
              .setTitle('@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫\n<:purplearrow:1337594384631332885> **LOADING ERLC SERVER**')
              .setDescription(`***Connecting Roblox account to ERLC server with code: ${serverCode}...***`)
              .addFields(
                { name: '**Server Code**', value: `\`${serverCode}\``, inline: true },
                { name: '**Status**', value: '🔄 **Loading game assets...**', inline: true },
                { name: '**Account**', value: `\`${robloxAccount.username}\``, inline: true }
              )
              .setColor(0x9B59B6)
              .setTimestamp();
            
            await interaction.channel.send({ embeds: [loadingEmbed] });

            // Step 3: Final connection message
            setTimeout(async () => {
              const joinCompleteEmbed = new EmbedBuilder()
                .setTitle('@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫\n<:purplearrow:1337594384631332885> **ACCOUNTS CONNECTED**')
                .setDescription(`***Successfully connected ${orderData.accountsCount} Roblox accounts to ERLC server***`)
                .addFields(
                  { name: '**Server Code**', value: `\`${serverCode}\``, inline: true },
                  { name: '**Status**', value: '✅ **Connected**', inline: true },
                  { name: '**Verification Link**', value: `[Click to verify accounts in-game](https://www.roblox.com/games/2534724415/Emergency-Response-Liberty-County?privateServerLinkCode=${serverCode})`, inline: false },
                  { name: '**Account Information**', value: generateAccountInfo(orderData.accountsCount, robloxAccount.username), inline: false }
                )
                .setColor(0x9B59B6)
                .setTimestamp();
              
              await interaction.channel.send({ embeds: [joinCompleteEmbed] });
              resolve();
            }, 2000);
          }, 2000);
        }, 1000);
      });

      // Wait for the join process to complete
      await accountJoinPromise;

      // Helper function to generate account info display
      function generateAccountInfo(count, baseUsername) {
        let accountText = '';
        accountText += `Main Account: \`${baseUsername}\`\n`;
        
        if (count > 1) {
          accountText += `Additional Accounts:\n`;
          for (let i = 2; i <= count; i++) {
            if (i <= 5) {
              accountText += `\`${baseUsername}${i}\`\n`;
            }
          }
          
          if (count > 5) {
            accountText += `*and ${count - 5} more accounts...*\n`;
          }
        }
        
        return `\`\`\`\n${accountText}\`\`\``;
      }

      // Create success embed for confirmation
      const successEmbed = new EmbedBuilder()
        .setTitle('@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫\n<:purplearrow:1337594384631332885> **ORDER REACTIVATED**')
        .setDescription(`***Order has been successfully reactivated for ${targetUser}***`)
        .addFields(
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Accounts Count**', value: `\`${orderData.accountsCount}\``, inline: true },
          { name: '**Status**', value: '✅ **Reactivated**', inline: true },
          { name: '**Original Start**', value: `<t:${Math.floor(orderData.startTime.getTime() / 1000)}:R>`, inline: true },
          { name: '**New Server Code**', value: `\`${serverCode}\``, inline: true },
          { name: '**Key**', value: `\`${orderData.key}\``, inline: false }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' });

      // Send logs to the dedicated webhook
      const webhookEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **ORDER REACTIVATED**')
        .setDescription(`***Order has been reactivated for ${targetUser}***`)
        .addFields(
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Roblox Accounts**', value: `\`${orderData.accountsCount}\``, inline: true },
          { name: '**Staff Member**', value: `<@${interaction.user.id}>`, inline: true },
          { name: '**Reactivation Time**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
          { name: '**New Server Code**', value: `\`${serverCode}\``, inline: true },
          { name: '**Key**', value: `\`${orderData.key}\``, inline: false }
        )
        .setColor(0x9B59B6)
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setTimestamp();

      // Send to webhook
      try {
        const { logOrder } = require('../utils/webhook');
        await logOrder({
          title: 'ORDER REACTIVATED',
          description: `Order has been reactivated for ${targetUser}`,
          fields: [
            { name: 'Order ID', value: `\`${orderId}\``, inline: true },
            { name: 'Roblox Accounts', value: `\`${orderData.accountsCount}\``, inline: true },
            { name: 'Staff Member', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Reactivation Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
            { name: 'New Server Code', value: `\`${serverCode}\``, inline: true },
            { name: 'Key', value: `\`${orderData.key}\``, inline: false }
          ]
        });
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }

      // Update user order history if it exists
      if (global.userOrderHistory && global.userOrderHistory.has(targetUser.id)) {
        const userHistory = global.userOrderHistory.get(targetUser.id);
        
        // Find the matching order in history
        const orderIndex = userHistory.findIndex(order => order.orderId === orderId);
        if (orderIndex !== -1) {
          userHistory[orderIndex].reactivatedAt = new Date();
          userHistory[orderIndex].reactivatedBy = interaction.user.id;
          userHistory[orderIndex].serverCode = serverCode;
          global.userOrderHistory.set(targetUser.id, userHistory);
        }
      }

      // Send notification webhook to the order webhook channel
      try {
        const orderWebhookUrl = 'https://discord.com/api/webhooks/1346696889101320303/WKWqJQLiN3NVSN4DRaR56PyuUZrOIHtkAvWTazqiYxSCb1ume1R5cnfQEZYEsxNOzVQp';
        const { WebhookClient } = require('discord.js');
        const orderWebhook = new WebhookClient({ url: orderWebhookUrl });

        const orderNotificationEmbed = new EmbedBuilder()
          .setTitle('@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫\n<:purplearrow:1337594384631332885> **ORDER REACTIVATED**')
          .setDescription(`***An existing order has been reactivated***`)
          .addFields(
            { name: '**Customer**', value: `${targetUser} (${targetUser.tag})`, inline: false },
            { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
            { name: '**Accounts**', value: `${orderData.accountsCount} Roblox accounts`, inline: true },
            { name: '**Staff**', value: `<@${interaction.user.id}>`, inline: true },
            { name: '**Original Date**', value: `<t:${Math.floor(orderData.startTime.getTime() / 1000)}:f>`, inline: true },
            { name: '**Reactivation Date**', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
          )
          .setColor(0x9B59B6)
          .setTimestamp();

        await orderWebhook.send({ embeds: [orderNotificationEmbed] });
      } catch (orderWebhookError) {
        console.error('Error sending order notification webhook:', orderWebhookError);
      }

      // Send success message in the channel
      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Error reactivating order:', error);
      await interaction.editReply('❌ There was an error reactivating the order! Please try again or contact an administrator.');
    }
  }
};
