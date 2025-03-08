const { SlashCommandBuilder, EmbedBuilder, WebhookClient } = require('discord.js');
const crypto = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generatekey')
    .setDescription('Generate a key for a customer')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to generate key for')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('accounts')
        .setDescription('Number of Roblox accounts for this key')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('queue_position')
        .setDescription('Position in queue')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('estimated_wait')
        .setDescription('Estimated wait time in minutes')
        .setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Check permissions
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      const isOwner = ownersIds.includes(interaction.user.id);

      if (!isStaff && !isOwner) {
        return interaction.editReply('❌ **You do not have permission to use this command!**');
      }

      const targetUser = interaction.options.getUser('user');
      const accountsCount = interaction.options.getInteger('accounts');
      const queuePosition = interaction.options.getInteger('queue_position');
      const estimatedWait = interaction.options.getInteger('estimated_wait');

      // Get target member
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.editReply(`❌ **Could not find member ${targetUser.tag} in this server.**`);
      }

      // Generate a unique order ID
      const orderId = `${Math.floor(Math.random() * 10000000).toString(16).toUpperCase()}`;

      // Generate a secure key using crypto module
      const generateSecureKey = () => {
        return crypto.randomBytes(16).toString('hex').toUpperCase();
      };

      const key = generateSecureKey();

      // Store the key in global.generatedKeys map
      if (!global.generatedKeys) {
        global.generatedKeys = new Map();
      }

      global.generatedKeys.set(key, {
        userId: targetUser.id,
        accountsCount: accountsCount,
        generatedAt: new Date(),
        generatedBy: interaction.user.id,
        orderId: orderId,
        used: false
      });

      // Placeholder values for missing variables
      const robloxUsername = targetUser.username; // Placeholder
      const duration = 1; // Placeholder - Assuming 1 day duration
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + duration); // Placeholder expiry date
      const proofImageUrl = null; // Placeholder


      // Send success message to staff
      const successEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **KEY GENERATED**')
        .setDescription(`***A key has been successfully generated for ${targetUser}***`)
        .addFields(
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Accounts**', value: `\`${accountsCount}\``, inline: true },
          { name: '**Key**', value: `\`${key}\``, inline: false },
          { name: '**__IMPORTANT__**', value: `***Please share this key securely with ${targetUser}.***` }
        )
        .setColor(0x9B59B6)
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

      // Send key to staff member in DM
      try {
        const staffDmEmbed = new EmbedBuilder()
          .setTitle('<:purplearrow:1337594384631332885> **KEY GENERATED**')
          .setDescription(`***Key for ${targetUser.tag}***`)
          .addFields(
            { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
            { name: '**Accounts**', value: `\`${accountsCount}\``, inline: true },
            { name: '**Key**', value: `\`${key}\``, inline: false },
            { name: '**__REMINDER__**', value: '***⚠️ This key is sensitive and should be shared securely.***' }
          )
          .setColor(0x9B59B6)
          .setTimestamp();

        await interaction.user.send({ embeds: [staffDmEmbed] });
      } catch (dmError) {
        console.error(`Could not send DM to staff ${interaction.user.tag}:`, dmError);
        await interaction.followUp({ content: '⚠️ **I couldn\'t send you the key via DM. Make sure your DMs are open!**', ephemeral: true });
      }

      // Send key to the user in DM
      try {
        const userDmEmbed = new EmbedBuilder()
          .setTitle('<:purplearrow:1337594384631332885> **YOUR KEY IS READY**')
          .setDescription(`***Here is your key for ${accountsCount} accounts***`)
          .addFields(
            { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
            { name: '**Key**', value: `\`${key}\``, inline: false },
            { name: '**__⚠️ IMPORTANT SECURITY WARNING__**', value: '***This key is strictly confidential and must not be shared with anyone. Keep it safe!***' }
          )
          .setColor(0x9B59B6)
          .setTimestamp();

        await targetUser.send({ embeds: [userDmEmbed] });
      } catch (userDmError) {
        console.error(`Could not send DM to user ${targetUser.tag}:`, userDmError);
        await interaction.followUp({
          content: `⚠️ **I couldn't send the key to ${targetUser} via DM. Their DMs may be closed. You'll need to share it securely in the ticket.**`,
          ephemeral: true
        });
      }

      // Send queue update to the channel
      const packageName = `${accountsCount} Bots`;

      const queueEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **QUEUE UPDATE**')
        .setDescription(`***A new key has been generated for ${targetUser}***`)
        .addFields(
          { name: '**Queue Position**', value: `#${queuePosition}`, inline: true },
          { name: '**Estimated Wait Time**', value: `${estimatedWait} minutes`, inline: true },
          { name: '**Package**', value: packageName, inline: true },
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp();

      // Send to the channel (not ephemeral)
      await interaction.channel.send({ content: `${targetUser}`, embeds: [queueEmbed] });

      // Log to webhook
      try {
        const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
        const webhook = new WebhookClient({ url: webhookUrl });

        const logEmbed = new EmbedBuilder()
          .setTitle('Key Generated')
          .setDescription(`A key has been generated for ${targetUser.tag}`)
          .addFields(
            { name: 'Order ID', value: `\`${orderId}\``, inline: true },
            { name: 'Accounts', value: `\`${accountsCount}\``, inline: true },
            { name: 'Generated By', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
            { name: 'Queue Position', value: `#${queuePosition}`, inline: true },
            { name: 'Estimated Wait', value: `${estimatedWait} minutes`, inline: true }
          )
          .setColor(0x9B59B6)
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
            .setTitle('<:alting:1336938112261029978> **KEY GENERATED**')
            .setDescription(`A key has been generated by ${interaction.user}`)
            .addFields(
              { name: 'Generated For', value: `${targetUser}`, inline: true },
              { name: 'Roblox Username', value: `\`${robloxUsername}\``, inline: true },
              { name: 'Package', value: `${accountsCount} Bots`, inline: true },
              { name: 'Order ID', value: `\`${orderId}\``, inline: true },
              { name: 'Duration', value: `${duration} days`, inline: true },
              { name: 'Expires', value: `<t:${Math.floor(expiryDate.getTime() / 1000)}:F>`, inline: true },
              { name: 'Status', value: '✅ Active', inline: true },
              { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true }
            )
            .setColor(0x9B59B6)
            .setTimestamp();

          if (proofImageUrl) {
            orderListEmbed.addFields({ name: 'Image', value: `[View Proof](${proofImageUrl})`, inline: true });
          }

          await orderListChannel.send({ content: `${interaction.user}`, embeds: [orderListEmbed] });
        }
      } catch (channelError) {
        console.error('Error sending to order list channel:', channelError);
      }

    } catch (error) {
      console.error('Error generating key:', error);
      await interaction.editReply('❌ **There was an error generating the key! Please try again or contact an administrator.**');
    }
  }
};