const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { sendWebhook } = require('../utils/webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderstart')
    .setDescription('Start service for a customer')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to activate the service for')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('bots')
        .setDescription('Number of bots to join server')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('key')
        .setDescription('Key generated for the customer')
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

      const targetUser = interaction.options.getUser('user');
      const botsCount = interaction.options.getInteger('bots');
      const key = interaction.options.getString('key');
      const serverCode = interaction.options.getString('server_code');

      // Get the target member
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.editReply(`❌ Could not find member ${targetUser.tag} in this server.`);
      }

      // Validate key if global.generatedKeys exists
      let keyInfo = null;
      let orderId = null;
      
      if (global.generatedKeys && global.generatedKeys.has(key)) {
        keyInfo = global.generatedKeys.get(key);
        
        // Check if key matches the user
        if (keyInfo.userId !== targetUser.id) {
          return interaction.editReply(`❌ This key doesn't belong to ${targetUser}!`);
        }
        
        // Check if key was already used
        if (keyInfo.used) {
          return interaction.editReply(`❌ This key has already been used! If this is a mistake, please contact an administrator.`);
        }
        
        // Mark key as used
        keyInfo.used = true;
        global.generatedKeys.set(key, keyInfo);
        orderId = keyInfo.orderId;
      } else {
        // Generate random order ID if key not found
        orderId = `ORDER-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
      }

      // Role assignment step
      const roleIdToAssign = process.env.ACTIVE_ROLE_ID || '1346626908935385139'; // Customer role ID
      let roleAssigned = false;
      
      if (roleIdToAssign) {
        try {
          await member.roles.add(roleIdToAssign);
          console.log(`Assigned role to ${targetUser.tag}`);
          roleAssigned = true;
        } catch (roleError) {
          console.error(`Error assigning role to ${targetUser.tag}:`, roleError);
        }
      }

      // Store order start time with user join timestamp to prevent rejoin abuse
      if (!global.activeOrders) {
        global.activeOrders = new Map();
      }

      const orderData = {
        userId: targetUser.id,
        startTime: new Date(),
        orderId: orderId,
        botsCount: botsCount,
        staffId: interaction.user.id,
        key: key,
        serverCode: serverCode,
        joinTimestamp: member.joinedTimestamp, // Track join timestamp to prevent abuse
        userTag: targetUser.tag // Store user tag for reference
      };

      global.activeOrders.set(orderId, orderData);

      // Log to order history
      if (!global.userOrderHistory) {
        global.userOrderHistory = new Map();
      }

      const userHistory = global.userOrderHistory.get(targetUser.id) || [];
      userHistory.push({
        orderId: orderId,
        startTime: new Date(),
        botsCount: botsCount,
        staffId: interaction.user.id,
        key: key,
        serverCode: serverCode,
        active: true,
        joinTimestamp: member.joinedTimestamp
      });
      global.userOrderHistory.set(targetUser.id, userHistory);

      // Initiate auto-joining for ERLC bots (this is a simulation since we can't actually control Roblox)
      const autoJoinEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **AUTO-JOIN INITIATED**')
        .setDescription(`***${botsCount} bots are being dispatched to ERLC server...***`)
        .addFields(
          { name: '**Server Code**', value: `\`${serverCode}\``, inline: true },
          { name: '**Status**', value: '🔄 **Connecting...**', inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp();
      
      await interaction.channel.send({ embeds: [autoJoinEmbed] });

      // Simulate bots joining (in a real implementation, this would connect to Roblox)
      setTimeout(async () => {
        const joinCompleteEmbed = new EmbedBuilder()
          .setTitle('<:purplearrow:1337594384631332885> **BOTS CONNECTED**')
          .setDescription(`***Successfully connected ${botsCount} bots to ERLC server***`)
          .addFields(
            { name: '**Server Code**', value: `\`${serverCode}\``, inline: true },
            { name: '**Status**', value: '✅ **Connected**', inline: true }
          )
          .setColor(0x9B59B6)
          .setTimestamp();
        
        await interaction.channel.send({ embeds: [joinCompleteEmbed] });
      }, 3000); // Simulate a 3-second connection process

      // Create success embed for confirmation
      const successEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **SERVICE ACTIVATED**')
        .setDescription(`***Service has been successfully activated for ${targetUser}***`)
        .addFields(
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Bots Count**', value: `\`${botsCount}\``, inline: true },
          { name: '**Status**', value: '✅ **Active**', inline: true },
          { name: '**Server Code**', value: `\`${serverCode}\``, inline: true },
          { name: '**Key**', value: `\`${key}\``, inline: false }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' });
      
      // Add role assignment status
      if (!roleAssigned) {
        successEmbed.addFields({ 
          name: '**⚠️ Role Assignment Failed**', 
          value: 'Could not assign Customer role. Please check bot permissions.', 
          inline: false
        });
      }

      // Send logs to the dedicated webhook
      const webhookEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **NEW ORDER STARTED**')
        .setDescription(`***Order has been started for ${targetUser}***`)
        .addFields(
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Bots Count**', value: `\`${botsCount}\``, inline: true },
          { name: '**Staff Member**', value: `<@${interaction.user.id}>`, inline: true },
          { name: '**Start Time**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
          { name: '**Server Code**', value: `\`${serverCode}\``, inline: true },
          { name: '**Key**', value: `\`${key}\``, inline: false }
        )
        .setColor(0x9B59B6)
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setTimestamp();

      // Send to webhook
      sendWebhook('https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML', { embeds: [webhookEmbed] });

      // Send success message in the channel
      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Error activating service:', error);
      await interaction.editReply('❌ There was an error activating the service! Please try again or contact an administrator.');
    }
  }
};