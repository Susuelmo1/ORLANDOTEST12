const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { sendWebhook } = require('../utils/webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shiftstart')
    .setDescription('Start your staff shift'),

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

      // Check if shift is already active
      if (!global.activeShifts) {
        global.activeShifts = new Map();
      }

      if (global.activeShifts.has(interaction.user.id)) {
        return interaction.editReply('❌ You already have an active shift! End it first with `/shiftend`.');
      }

      // Record shift start time
      const shiftData = {
        userId: interaction.user.id,
        startTime: new Date(),
        orderCount: 0,
        ticketCount: 0
      };

      global.activeShifts.set(interaction.user.id, shiftData);

      // Create shift start embed
      const shiftEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **SHIFT STARTED**')
        .setDescription(`***${interaction.user} has started their staff shift***`)
        .addFields(
          { name: '**Start Time**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
          { name: '**Staff Member**', value: `${interaction.user}`, inline: true },
          { name: '**<:PurpleLine:1336946927282950165> Tracking**', value: '> Your shift time and activity will be tracked until you use `/shiftend`\n> All orders during this period will be attributed to your shift.' }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setFooter({ text: 'ERLC Alting Support' });

      // Log in channel
      await interaction.editReply({ embeds: [shiftEmbed] });

      // Log to webhook
      const webhookEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **STAFF SHIFT STARTED**')
        .setDescription(`***A staff member has started their shift***`)
        .addFields(
          { name: '**Staff Member**', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
          { name: '**Start Time**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
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
      console.error('Error starting shift:', error);
      await interaction.editReply('❌ There was an error starting your shift!');
    }
  }
};