
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shiftstart')
    .setDescription('Start a new alting shift')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to start shift for (default: yourself)')
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
      
      // Initialize shifts data structure if not exists
      if (!global.staffShifts) {
        global.staffShifts = new Map();
      }
      
      // Check if user already has an active shift
      const existingShift = global.staffShifts.get(targetUser.id);
      if (existingShift && existingShift.active) {
        return interaction.editReply(`❌ ${targetUser.id === interaction.user.id ? 'You already have' : `${targetUser.tag} already has`} an active shift! Use \`/shiftend\` to end it first.`);
      }
      
      // Create new shift
      const shiftData = {
        userId: targetUser.id,
        startTime: new Date(),
        active: true,
        createdBy: interaction.user.id,
        totals: {
          orders: 0,
          botsDeployed: 0
        }
      };
      
      global.staffShifts.set(targetUser.id, shiftData);
      
      // Create success embed
      const shiftEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **SHIFT STARTED**')
        .setDescription(`***${targetUser.id === interaction.user.id ? 'Your' : `${targetUser}'s`} alting shift has been started***`)
        .addFields(
          { name: '**Staff Member**', value: `${targetUser}`, inline: true },
          { name: '**Start Time**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
          { name: '**Status**', value: '✅ **Active**', inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Shift System' });
      
      // Log to webhook
      try {
        const { WebhookClient } = require('discord.js');
        const webhook = new WebhookClient({ url: 'https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML' });
        
        const webhookEmbed = new EmbedBuilder()
          .setTitle('🕒 Shift Started')
          .setDescription(`${targetUser} has started an alting shift`)
          .addFields(
            { name: 'Staff Member', value: `${targetUser}`, inline: true },
            { name: 'Started By', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Start Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          )
          .setColor(0x00FF00)
          .setTimestamp();
        
        await webhook.send({ embeds: [webhookEmbed] });
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }
      
      // Send confirmation
      await interaction.editReply({ embeds: [shiftEmbed] });
      
    } catch (error) {
      console.error('Error starting shift:', error);
      await interaction.editReply('❌ There was an error starting the shift! Please try again or contact an administrator.');
    }
  }
};
