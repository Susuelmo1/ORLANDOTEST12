
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shiftend')
    .setDescription('End an active alting shift')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to end shift for (default: yourself)')
        .setRequired(false)),

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

      // Get the target user (either mentioned user or self)
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      // Check if user has an active shift
      if (!global.staffShifts || !global.staffShifts.has(targetUser.id)) {
        return interaction.editReply(`❌ ${targetUser.id === interaction.user.id ? 'You don\'t have' : `${targetUser.tag} doesn't have`} an active shift!`);
      }
      
      const shiftData = global.staffShifts.get(targetUser.id);
      if (!shiftData.active) {
        return interaction.editReply(`❌ ${targetUser.id === interaction.user.id ? 'You don\'t have' : `${targetUser.tag} doesn't have`} an active shift!`);
      }
      
      // Calculate shift duration
      const startTime = new Date(shiftData.startTime);
      const endTime = new Date();
      const durationMs = endTime - startTime;
      const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
      const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      // Update shift data
      shiftData.active = false;
      shiftData.endTime = endTime;
      shiftData.endedBy = interaction.user.id;
      shiftData.duration = {
        hours: durationHours,
        minutes: durationMinutes
      };
      
      global.staffShifts.set(targetUser.id, shiftData);
      
      // Create success embed
      const shiftEndEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **SHIFT ENDED**')
        .setDescription(`***${targetUser.id === interaction.user.id ? 'Your' : `${targetUser}'s`} alting shift has ended***`)
        .addFields(
          { name: '**Staff Member**', value: `${targetUser}`, inline: true },
          { name: '**Duration**', value: `${durationHours}h ${durationMinutes}m`, inline: true },
          { name: '**Started**', value: `<t:${Math.floor(startTime.getTime() / 1000)}:F>`, inline: false },
          { name: '**Ended**', value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>`, inline: false },
          { name: '**Orders Completed**', value: `${shiftData.totals.orders}`, inline: true },
          { name: '**Bots Deployed**', value: `${shiftData.totals.botsDeployed}`, inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Shift System' });
      
      // Log to webhook
      try {
        const { WebhookClient } = require('discord.js');
        const webhook = new WebhookClient({ url: 'https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML' });
        
        const webhookEmbed = new EmbedBuilder()
          .setTitle('🕒 Shift Ended')
          .setDescription(`${targetUser} has ended their alting shift`)
          .addFields(
            { name: 'Staff Member', value: `${targetUser}`, inline: true },
            { name: 'Ended By', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Duration', value: `${durationHours}h ${durationMinutes}m`, inline: true },
            { name: 'Orders Completed', value: `${shiftData.totals.orders}`, inline: true },
            { name: 'Bots Deployed', value: `${shiftData.totals.botsDeployed}`, inline: true },
            { name: 'Start Time', value: `<t:${Math.floor(startTime.getTime() / 1000)}:F>`, inline: false },
            { name: 'End Time', value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>`, inline: false }
          )
          .setColor(0xFFA500)
          .setTimestamp();
        
        await webhook.send({ embeds: [webhookEmbed] });
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }
      
      // Send confirmation
      await interaction.editReply({ embeds: [shiftEndEmbed] });
      
    } catch (error) {
      console.error('Error ending shift:', error);
      await interaction.editReply('❌ There was an error ending the shift! Please try again or contact an administrator.');
    }
  }
};
