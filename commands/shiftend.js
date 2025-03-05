const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { sendWebhook } = require('../utils/webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shiftend')
    .setDescription('End your staff shift')
    .addStringOption(option =>
      option.setName('notes')
        .setDescription('Optional notes about your shift')
        .setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // Check if user is staff
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      const isOwner = ownersIds.includes(interaction.user.id);

      if (!isStaff && !isOwner) {
        return interaction.editReply('❌ Only staff members can use this command!');
      }

      // Check if shift exists
      if (!global.activeShifts || !global.activeShifts.has(interaction.user.id)) {
        return interaction.editReply('❌ You don\'t have an active shift! Start one with `/shiftstart`.');
      }

      const shiftData = global.activeShifts.get(interaction.user.id);
      const startTime = new Date(shiftData.startTime);
      const endTime = new Date();
      const notes = interaction.options.getString('notes') || 'No additional notes';

      // Calculate duration
      const durationMs = endTime - startTime;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

      // Store shift in history
      if (!global.shiftHistory) {
        global.shiftHistory = [];
      }

      global.shiftHistory.push({
        userId: interaction.user.id,
        startTime: startTime,
        endTime: endTime,
        duration: {
          hours: hours,
          minutes: minutes,
          totalMinutes: Math.floor(durationMs / (1000 * 60))
        },
        orderCount: shiftData.orderCount || 0,
        ticketCount: shiftData.ticketCount || 0,
        notes: notes
      });

      // Remove active shift
      global.activeShifts.delete(interaction.user.id);

      // Create shift end embed
      const shiftEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **SHIFT ENDED**')
        .setDescription(`***${interaction.user} has ended their staff shift***`)
        .addFields(
          { name: '**Start Time**', value: `<t:${Math.floor(startTime.getTime() / 1000)}:F>`, inline: true },
          { name: '**End Time**', value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>`, inline: true },
          { name: '**Duration**', value: `\`${hours}h ${minutes}m\``, inline: true },
          { name: '**Orders Handled**', value: `\`${shiftData.orderCount || 0}\``, inline: true },
          { name: '**Tickets Handled**', value: `\`${shiftData.ticketCount || 0}\``, inline: true },
          { name: '**<:PurpleLine:1336946927282950165> Notes**', value: `\`${notes}\`` }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setFooter({ text: 'ERLC Alting Support' });

      // Log in channel
      await interaction.editReply({ embeds: [shiftEmbed] });

      // Log to webhook
      const webhookEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **STAFF SHIFT ENDED**')
        .setDescription(`***A staff member has ended their shift***`)
        .addFields(
          { name: '**Staff Member**', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
          { name: '**Duration**', value: `\`${hours}h ${minutes}m\``, inline: true },
          { name: '**Start Time**', value: `<t:${Math.floor(startTime.getTime() / 1000)}:F>`, inline: false },
          { name: '**End Time**', value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>`, inline: false },
          { name: '**Orders Handled**', value: `\`${shiftData.orderCount || 0}\``, inline: true },
          { name: '**Tickets Handled**', value: `\`${shiftData.ticketCount || 0}\``, inline: true },
          { name: '**<:PurpleLine:1336946927282950165> Notes**', value: `\`${notes}\`` }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png');

      // Use the enhanced webhook sender
      sendWebhook(
        process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09',
        { embeds: [webhookEmbed] }
      );

    } catch (error) {
      console.error('Error ending shift:', error);
      await interaction.editReply('❌ There was an error ending your shift!');
    }
  }
};