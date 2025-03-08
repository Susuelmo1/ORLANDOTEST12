
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderproofboost')
    .setDescription('Submit proof for a Discord boost order')
    .addStringOption(option =>
      option.setName('boost_type')
        .setDescription('The type of boost package')
        .setRequired(true)
        .addChoices(
          { name: '14x Boosts (1 Month) - $19.99', value: '1month' },
          { name: '14x Boosts (3 Months) - $26.99', value: '3months' }
        ))
    .addAttachmentOption(option =>
      option.setName('proof')
        .setDescription('Proof of payment for the boost order')
        .setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // Get the selected boost type and payment proof
      const boostType = interaction.options.getString('boost_type');
      const proofAttachment = interaction.options.getAttachment('proof');

      // Validate the proof attachment
      if (!proofAttachment) {
        return interaction.editReply('❌ Please provide proof of payment!');
      }

      // Accept any image file without strict content-type checking
      // Many image uploads might have different or inconsistent content types
      if (!proofAttachment.contentType || !proofAttachment.contentType.startsWith('image/')) {
        // Do a fallback check on file extension
        const fileExtension = proofAttachment.name.split('.').pop().toLowerCase();
        const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        if (!validExtensions.includes(fileExtension)) {
          return interaction.editReply('❌ Please upload a valid image file as proof (JPEG, PNG, GIF, or WEBP)!');
        }
      }

      // Get boost package details
      const boostPackage = boostType === '1month' ? '14x Boosts (1 Month)' : '14x Boosts (3 Months)';
      const boostPrice = boostType === '1month' ? '$19.99 USD' : '$26.99 USD';
      
      // Generate a unique Boost ID
      const boostId = `BOOST-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      // Create the confirmation embed for the ticket channel
      const confirmationEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **BOOST ORDER SUBMITTED**')
        .setDescription(`***Your Discord boost order has been submitted successfully!***`)
        .addFields(
          { name: '**Boost Package**', value: boostPackage, inline: true },
          { name: '**Price**', value: boostPrice, inline: true },
          { name: '**Boost ID**', value: `\`${boostId}\``, inline: true },
          { name: '**Status**', value: '🔄 **Processing**', inline: false },
          { name: '**Next Steps**', value: 'A staff member will review your proof and process your boost order. Boosts will be applied within 1 hour.', inline: false }
        )
        .setColor(0x9B59B6)
        .setImage(proofAttachment.url)
        .setTimestamp();

      await interaction.editReply({ embeds: [confirmationEmbed] });

      // Send a notification to the bot owner (as requested in DM)
      try {
        const ownerId = '523693281541095424'; // Owner ID
        const owner = await client.users.fetch(ownerId);
        
        const ownerEmbed = new EmbedBuilder()
          .setTitle('🚨 **NEW BOOST ORDER**')
          .setDescription(`A new Discord boost order has been submitted!`)
          .addFields(
            { name: 'User', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
            { name: 'Boost Package', value: boostPackage, inline: true },
            { name: 'Boost ID', value: `\`${boostId}\``, inline: true },
            { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: false }
          )
          .setColor(0x9B59B6)
          .setImage(proofAttachment.url)
          .setTimestamp();
          
        await owner.send({ embeds: [ownerEmbed] });
      } catch (dmError) {
        console.error('Error sending DM to owner:', dmError);
      }

      // Log to webhook
      try {
        const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
        const { WebhookClient } = require('discord.js');
        const webhook = new WebhookClient({ url: webhookUrl });

        const logEmbed = new EmbedBuilder()
          .setTitle('Boost Order Submitted')
          .setDescription(`A new Discord boost order has been submitted`)
          .addFields(
            { name: 'User', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
            { name: 'Boost Package', value: boostPackage, inline: true },
            { name: 'Boost ID', value: `\`${boostId}\``, inline: true },
            { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: false }
          )
          .setColor(0x9B59B6)
          .setTimestamp();

        await webhook.send({ embeds: [logEmbed] });
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }

      // Store the boost order in a global array if it doesn't exist yet
      if (!global.boostOrders) {
        global.boostOrders = [];
      }

      global.boostOrders.push({
        boostId: boostId,
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        boostType: boostType,
        boostPackage: boostPackage,
        price: boostPrice,
        proofUrl: proofAttachment.url,
        status: 'processing',
        submitTime: new Date(),
        channelId: interaction.channel.id
      });

    } catch (error) {
      console.error('Error with boost order proof command:', error);
      await interaction.editReply('❌ There was an error submitting your boost order proof! Please try again or contact a staff member.');
    }
  }
};
