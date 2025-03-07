const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Assign a role to a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to assign the role to')
        .setRequired(true))
    .addRoleOption(option => 
      option.setName('role')
        .setDescription('Role to assign')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for assigning the role')
        .setRequired(true)),

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

      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      const reason = interaction.options.getString('reason');

      // Get the member object
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.editReply(`❌ Could not find member ${user.tag} in this server.`);
      }

      // Check if the bot has permission to manage roles
      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.editReply('❌ I don\'t have permission to manage roles!');
      }

      // Check if the role is higher than the bot's highest role
      if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.editReply('❌ I cannot assign a role that is higher than or equal to my highest role!');
      }

      // Check if the role is higher than the user's highest role
      if (role.position >= interaction.member.roles.highest.position && !isOwner) {
        return interaction.editReply('❌ You cannot assign a role that is higher than or equal to your highest role!');
      }

      // Assign the role
      try {
        await member.roles.add(role.id, reason);
      } catch (error) {
        console.error('Error assigning role:', error);
        return interaction.editReply(`❌ Failed to assign role: ${error.message}`);
      }

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **ROLE ASSIGNED**')
        .setDescription(`***Successfully assigned role to ${user}***`)
        .addFields(
          { name: '**User**', value: `${user}`, inline: true },
          { name: '**Role**', value: `${role}`, inline: true },
          { name: '**Reason**', value: reason, inline: false },
          { name: '**Assigned By**', value: `${interaction.user}`, inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp();

      // Log to webhook if configured
      try {
        if (process.env.LOG_WEBHOOK_URL) {
          const { WebhookClient } = require('discord.js');
          const webhook = new WebhookClient({ url: process.env.LOG_WEBHOOK_URL });

          const logEmbed = new EmbedBuilder()
            .setTitle('<:alting:1336938112261029978> **ROLE UPDATED**')
            .setDescription(`A role has been assigned to a user`)
            .addFields(
              { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
              { name: 'Role', value: `${role.name}`, inline: true },
              { name: 'Reason', value: reason, inline: false },
              { name: 'Assigned By', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true }
            )
            .setColor(0x9B59B6)
            .setTimestamp();

          await webhook.send({ embeds: [logEmbed] });
        }
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      console.error('Error with role command:', error);
      await interaction.editReply('❌ There was an error assigning the role! Please try again or contact an administrator.');
    }
  }
};