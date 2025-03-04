
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generatekey')
    .setDescription('Generate an alting key')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to generate key for')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('duration')
        .setDescription('Duration of the key (daily, weekly, monthly, or lifetime)')
        .setRequired(true)
        .addChoices(
          { name: 'Daily', value: 'daily' },
          { name: 'Weekly', value: 'weekly' },
          { name: 'Monthly', value: 'monthly' },
          { name: 'Lifetime', value: 'lifetime' }
        )),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // Check if user has Server Alter role
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164'; // Server Alter role ID
      const hasStaffRole = interaction.member.roles.cache.has(staffRoleId);

      if (!hasStaffRole) {
        return interaction.editReply('❌ Only Server Alter members can use this command!');
      }

      const targetUser = interaction.options.getUser('user');
      const duration = interaction.options.getString('duration');

      // Calculate expiration days based on duration
      let expirationDays = 0;
      let durationText = '';

      switch (duration) {
        case 'daily':
          expirationDays = 1;
          durationText = '1 day';
          break;
        case 'weekly':
          expirationDays = 7;
          durationText = '7 days';
          break;
        case 'monthly':
          expirationDays = 30;
          durationText = '30 days';
          break;
        case 'lifetime':
          expirationDays = 36500; // ~100 years
          durationText = 'Lifetime';
          break;
      }

      // Generate key
      const key = crypto.randomBytes(16).toString('hex').toUpperCase();

      // Calculate expiration date
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expirationDays);
      const formattedDate = expirationDate.toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });

      // Create key embed for the channel
      const keyEmbed = new EmbedBuilder()
        .setTitle('🔑 Key Generated Successfully')
        .setDescription(`A key has been generated for ${targetUser}`)
        .addFields(
          { name: 'Duration', value: durationText, inline: true },
          { name: 'Expires', value: duration === 'lifetime' ? 'Never' : formattedDate, inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' });

      // Create DM embed with the actual key
      const dmEmbed = new EmbedBuilder()
        .setTitle('🔑 Your ERLC Alting Key')
        .setDescription('Your key has been generated. Keep this information secure!')
        .addFields(
          { name: 'Your Key', value: `\`${key}\``, inline: false },
          { name: 'Duration', value: durationText, inline: true },
          { name: 'Expires', value: duration === 'lifetime' ? 'Never' : formattedDate, inline: true },
          { name: '⚠️ Important', value: 'This key is personal and should not be shared with anyone!' }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' });

      // Send the key to both the user's DM and the channel
      try {
        // Send to DM
        await targetUser.send({ embeds: [dmEmbed] });

        // Also show in channel for staff reference
        const channelKeyEmbed = new EmbedBuilder()
          .setTitle('🔑 Key Generated')
          .setDescription(`A key has been generated for ${targetUser}`)
          .addFields(
            { name: 'Key', value: `\`${key}\``, inline: false },
            { name: 'Duration', value: durationText, inline: true },
            { name: 'Expires', value: duration === 'lifetime' ? 'Never' : formattedDate, inline: true },
            { name: 'Next Step', value: `Use \`/orderstart ${key} @${targetUser.username}\` to activate the service` }
          )
          .setColor(0x9B59B6)
          .setTimestamp()
          .setFooter({ text: 'ERLC Alting Support' });

        await interaction.editReply({ 
          content: `✅ Key successfully generated for ${targetUser}!`,
          embeds: [channelKeyEmbed]
        });
      } catch (error) {
        // If we can't DM the user, notify in the channel
        console.error('Error sending DM:', error);

        const channelKeyEmbed = new EmbedBuilder()
          .setTitle('🔑 Key Generated')
          .setDescription(`A key has been generated for ${targetUser}`)
          .addFields(
            { name: 'Key', value: `\`${key}\``, inline: false },
            { name: 'Duration', value: durationText, inline: true },
            { name: 'Expires', value: duration === 'lifetime' ? 'Never' : formattedDate, inline: true },
            { name: 'DM Status', value: '❌ Could not send to user\'s DM. Make sure they have DMs enabled!', inline: false },
            { name: 'Next Step', value: `Use \`/orderstart ${key} @${targetUser.username}\` to activate the service` }
          )
          .setColor(0x9B59B6)
          .setTimestamp()
          .setFooter({ text: 'ERLC Alting Support' });

        await interaction.editReply({ 
          content: `⚠️ Key generated but couldn't send to ${targetUser}'s DMs!`,
          embeds: [channelKeyEmbed]
        });
      }

    } catch (error) {
      console.error('Error generating key:', error);
      await interaction.editReply('❌ There was an error generating the key!');
    }
  }
};
