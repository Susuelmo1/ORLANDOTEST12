
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderstart')
    .setDescription('Start service using a generated key and order ID')
    .addStringOption(option => 
      option.setName('key')
        .setDescription('The generated key to activate')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('orderid')
        .setDescription('The order ID to activate')
        .setRequired(true))
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to activate the service for')
        .setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // Check if user has staff role
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      const isOwner = ownersIds.includes(interaction.user.id);

      if (!isStaff && !isOwner) {
        return interaction.editReply('❌ You do not have permission to use this command!');
      }

      const key = interaction.options.getString('key');
      const orderId = interaction.options.getString('orderid');
      const targetUser = interaction.options.getUser('user');

      // Check if the order ID exists
      if (!client.orderProofs || !client.orderProofs.has(orderId)) {
        return interaction.editReply(`❌ Order ID \`${orderId}\` not found!`);
      }

      // Check if the key exists and is valid (in a real system, this would query a database)
      if (!global.generatedKeys || !global.generatedKeys.has(key)) {
        return interaction.editReply('❌ Invalid key. Please check the key and try again.');
      }

      const keyDetails = global.generatedKeys.get(key);
      
      // Check if key is already used
      if (keyDetails.used) {
        return interaction.editReply('❌ This key has already been used!');
      }

      // Get order details
      const orderDetails = client.orderProofs.get(orderId);
      
      // Mark key as used
      keyDetails.used = true;
      keyDetails.activatedBy = interaction.user.id;
      keyDetails.activatedAt = new Date();
      global.generatedKeys.set(key, keyDetails);

      // Create success embed with purple theme
      const successEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **SERVICE ACTIVATED**')
        .setDescription(`***Service has been successfully activated for ${targetUser}***`)
        .addFields(
          { name: '**Key Used**', value: `\`${key}\``, inline: true },
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Package**', value: `\`${keyDetails.package}\``, inline: true },
          { name: '**Activated By**', value: `${interaction.user}`, inline: true },
          { name: '**Roblox Username**', value: `\`${orderDetails.robloxUsername}\``, inline: true },
          { name: '**Status**', value: '✅ **Active**', inline: true }
        )
        .setColor(0x9B59B6) // Purple color
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' })
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png');

      // Add screenshot if available
      if (orderDetails.screenshotUrl) {
        successEmbed.setThumbnail(orderDetails.screenshotUrl);
      }

      // Try to add appropriate roles to the user
      try {
        const memberPromise = interaction.guild.members.fetch(targetUser.id);
        const member = await memberPromise;
        
        // Always add Alting Customer role
        const customerRoleId = '1345908233700773978';
        await member.roles.add(customerRoleId);
        
        // Add specific VIP role based on package
        if (keyDetails.package.includes('VIP')) {
          let vipRoleId = '';
          
          if (keyDetails.package === 'Lifetime VIP') {
            vipRoleId = '1336741718531248220';
          } else if (keyDetails.package === 'Month VIP') {
            vipRoleId = '1336741762491875430';
          } else if (keyDetails.package === 'Week VIP') {
            vipRoleId = '1336741795454783561';
          }
          
          if (vipRoleId) {
            await member.roles.add(vipRoleId);
            successEmbed.addFields({ 
              name: '**<:PurpleLine:1336946927282950165> Roles Added**', 
              value: `✅ **Alting Customer**\n✅ **${keyDetails.package}**` 
            });
          }
        } else {
          successEmbed.addFields({ 
            name: '**<:PurpleLine:1336946927282950165> Role Added**', 
            value: '✅ **Alting Customer**' 
          });
        }
      } catch (roleError) {
        console.error('Error adding roles:', roleError);
        successEmbed.addFields({ 
          name: '**<:PurpleLine:1336946927282950165> Role Assignment**', 
          value: '❌ **Could not assign roles. Please add them manually.**' 
        });
      }

      // Try to notify the user via DM
      try {
        const userDmEmbed = new EmbedBuilder()
          .setTitle('<:purplearrow:1337594384631332885> **YOUR SERVICE IS ACTIVE**')
          .setDescription(`***Your ${keyDetails.package} service has been activated!***`)
          .addFields(
            { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
            { name: '**Activated On**', value: `\`${new Date().toLocaleDateString()}\``, inline: true },
            { name: '**<:PurpleLine:1336946927282950165> Important**', value: '__***Keep your key secure and never share it with others!***__\nIf you need help, please open a support ticket in our server.' }
          )
          .setColor(0x9B59B6)
          .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
          .setFooter({ text: 'ERLC Alting Support' })
          .setTimestamp();

        await targetUser.send({ embeds: [userDmEmbed] });
      } catch (dmError) {
        console.error('Could not send DM to user:', dmError);
        await interaction.channel.send(`Note: Unable to send activation notification to ${targetUser} via DM.`);
      }

      // Send the success message in the channel
      await interaction.editReply({ embeds: [successEmbed] });

      // Log to a webhook
      try {
        const webhookUrl = 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
        const { WebhookClient } = require('discord.js');
        const webhook = new WebhookClient({ url: webhookUrl });
          
          const logEmbed = new EmbedBuilder()
            .setTitle('Service Activated')
            .setDescription(`A service has been activated by ${interaction.user.tag}`)
            .addFields(
              { name: 'Activated For', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
              { name: 'Package', value: keyDetails.package, inline: true },
              { name: 'Order ID', value: orderId, inline: true },
              { name: 'Roblox Username', value: orderDetails.robloxUsername, inline: true },
              { name: 'Key', value: `||${key}||`, inline: false },
              { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: false }
            )
            .setColor(0x9B59B6)
            .setTimestamp();
            
          await webhook.send({ embeds: [logEmbed] });
        }
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }

    } catch (error) {
      console.error('Error activating service:', error);
      await interaction.editReply('❌ There was an error activating the service! Please try again or contact an administrator.');
    }
  }
};
