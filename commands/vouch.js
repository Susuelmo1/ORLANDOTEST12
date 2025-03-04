
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouch')
    .setDescription('Submit a vouch for our services')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Your Roblox username')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('stars')
        .setDescription('Rating from 1-5 stars')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for your rating')
        .setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      const username = interaction.options.getString('username');
      const stars = interaction.options.getInteger('stars');
      const reason = interaction.options.getString('reason');

      // Initialize vouches if not exist
      if (!global.vouches) {
        global.vouches = [];
      }

      // Store the vouch
      const vouch = {
        userId: interaction.user.id,
        username: username,
        stars: stars,
        reason: reason,
        timestamp: new Date(),
        messageId: null // Will be updated after sending the message
      };

      global.vouches.push(vouch);

      // Create star display
      const starDisplay = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);

      // Create vouch embed
      const vouchEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **NEW VOUCH**')
        .setDescription(`***Thank you for your feedback!***`)
        .addFields(
          { name: '**User**', value: `${interaction.user}`, inline: false },
          { name: '**Roblox Username**', value: `\`${username}\``, inline: true },
          { name: '**Rating**', value: `\`${starDisplay} (${stars}/5)\``, inline: true },
          { name: '**Feedback**', value: `> ${reason}` }
        )
        .setColor(0x9B59B6)
        .setTimestamp();

      // Send to both the interaction channel and potentially a designated vouch channel
      const replyMessage = await interaction.editReply({ embeds: [vouchEmbed] });
      
      // Update vouch with message ID
      vouch.messageId = replyMessage.id;
      
      // Try to send to a designated vouch channel if one exists
      try {
        const vouchChannelId = process.env.VOUCH_CHANNEL_ID;
        if (vouchChannelId) {
          const vouchChannel = await interaction.guild.channels.fetch(vouchChannelId);
          if (vouchChannel) {
            await vouchChannel.send({ embeds: [vouchEmbed] });
          }
        }
      } catch (channelError) {
        console.error('Error sending to vouch channel:', channelError);
        // Don't throw error, as the vouch was already sent to the original channel
      }

      // Log to a webhook
      try {
        const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
        const { WebhookClient } = require('discord.js');
        const webhook = new WebhookClient({ url: webhookUrl });

        const logEmbed = new EmbedBuilder()
          .setTitle('New Vouch Submitted')
          .setDescription(`A new vouch has been submitted by ${interaction.user.tag}`)
          .addFields(
            { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Roblox Username', value: username, inline: true },
            { name: 'Rating', value: `${stars}/5 stars`, inline: true },
            { name: 'Feedback', value: reason, inline: false },
            { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: false }
          )
          .setColor(0x9B59B6)
          .setTimestamp();

        await webhook.send({ embeds: [logEmbed] });
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }

    } catch (error) {
      console.error('Error with vouch command:', error);
      await interaction.editReply('❌ There was an error submitting your vouch! Please try again.');
    }
  }
};
