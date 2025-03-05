const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { sendWebhook } = require('../utils/webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shiftend')
    .setDescription('End your staff shift and see your activity summary'),

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

      // Check if staff is on shift
      if (!global.staffShifts || !global.staffShifts.has(interaction.user.id)) {
        return interaction.editReply('❌ You don\'t have an active shift! Use `/shiftstart` to start a shift first.');
      }

      const staffData = global.staffShifts.get(interaction.user.id);

      if (!staffData.active) {
        return interaction.editReply('❌ You don\'t have an active shift! Use `/shiftstart` to start a shift first.');
      }

      // Calculate shift duration
      const startTime = new Date(staffData.startTime);
      const endTime = new Date();
      const durationMs = endTime - startTime;
      const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
      const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

      // Mark shift as inactive
      staffData.active = false;
      staffData.endTime = endTime;
      staffData.duration = {
        hours: durationHours,
        minutes: durationMinutes
      };

      global.staffShifts.set(interaction.user.id, staffData);

      // Create shift end embed
      const shiftEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **SHIFT ENDED**')
        .setDescription(`***${interaction.user} has ended their shift***`)
        .addFields(
          { name: '**Duration**', value: `${durationHours}h ${durationMinutes}m`, inline: true },
          { name: '**Orders Completed**', value: `${staffData.totals.orders}`, inline: true },
          { name: '**Bots Deployed**', value: `${staffData.totals.botsDeployed}`, inline: true },
          { name: '**Start Time**', value: `<t:${Math.floor(startTime.getTime() / 1000)}:F>`, inline: true },
          { name: '**End Time**', value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>`, inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' });

      // Send to webhook
      const webhookEmbed = new EmbedBuilder()
        .setTitle('🔴 Staff Shift Ended')
        .setDescription(`${interaction.user.tag} has ended their shift`)
        .addFields(
          { name: 'Staff Member', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Duration', value: `${durationHours}h ${durationMinutes}m`, inline: true },
          { name: 'Orders Completed', value: `${staffData.totals.orders}`, inline: true },
          { name: 'Bots Deployed', value: `${staffData.totals.botsDeployed}`, inline: true },
          { name: 'Start Time', value: `<t:${Math.floor(startTime.getTime() / 1000)}:F>`, inline: true },
          { name: 'End Time', value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>`, inline: true }
        )
        .setColor(0xFF0000)
        .setTimestamp();

      sendWebhook('https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML', { embeds: [webhookEmbed] });

      // Send success message
      await interaction.editReply({ embeds: [shiftEmbed] });

    } catch (error) {
      console.error('Error ending shift:', error);
      await interaction.editReply('❌ There was an error ending your shift! Please try again or contact an administrator.');
    }
  }
};