const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { sendWebhook } = require('../utils/webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shiftstart')
    .setDescription('Start your staff shift and track your activity'),

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

      // Initialize staff shifts tracking
      if (!global.staffShifts) {
        global.staffShifts = new Map();
      }

      // Check if staff is already on shift
      if (global.staffShifts.has(interaction.user.id)) {
        const staffData = global.staffShifts.get(interaction.user.id);
        if (staffData.active) {
          return interaction.editReply('❌ You are already on an active shift! Use `/shiftend` to end your current shift first.');
        }
      }

      // Create shift data
      const shiftData = {
        active: true,
        startTime: new Date(),
        totals: {
          orders: 0,
          botsDeployed: 0
        }
      };

      // Store shift data
      global.staffShifts.set(interaction.user.id, shiftData);

      // Create shift start embed
      const shiftEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **SHIFT STARTED**')
        .setDescription(`***${interaction.user} has started their shift***`)
        .addFields(
          { name: '**Start Time**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
          { name: '**Status**', value: '✅ **Active**', inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' });

      // Send to webhook
      const webhookEmbed = new EmbedBuilder()
        .setTitle('🟢 Staff Shift Started')
        .setDescription(`${interaction.user.tag} has started their shift`)
        .addFields(
          { name: 'Staff Member', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Start Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setColor(0x00FF00)
        .setTimestamp();

      sendWebhook('https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML', { embeds: [webhookEmbed] });

      // Send success message
      await interaction.editReply({ embeds: [shiftEmbed] });

    } catch (error) {
      console.error('Error starting shift:', error);
      await interaction.editReply('❌ There was an error starting your shift! Please try again or contact an administrator.');
    }
  }
};