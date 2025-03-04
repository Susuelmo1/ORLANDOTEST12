
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Global storage for infractions (would be replaced with database in production)
if (!global.infractions) {
  global.infractions = {
    settings: {
      enabled: true,
      staffRoleId: '1336741474708230164',
      logChannelId: ''
    },
    reasons: [
      { 
        id: 'warning', 
        name: 'Warning', 
        description: 'A formal warning for minor rule violations',
        action: 'none'
      },
      { 
        id: 'mute', 
        name: 'Mute', 
        description: 'Temporarily restrict a user from sending messages',
        action: 'add_role',
        roleId: '1336741636277583965', // Muted role ID
        duration: 3600000 // 1 hour in milliseconds
      },
      { 
        id: 'kick', 
        name: 'Kick', 
        description: 'Remove a user from the server (they can rejoin)',
        action: 'kick'
      },
      { 
        id: 'tempban', 
        name: 'Temporary Ban', 
        description: 'Ban a user for a specific duration',
        action: 'ban',
        duration: 604800000 // 7 days in milliseconds
      },
      { 
        id: 'ban', 
        name: 'Permanent Ban', 
        description: 'Permanently ban a user from the server',
        action: 'ban'
      }
    ],
    promotions: [
      {
        id: 'junior_staff',
        name: 'Junior Staff',
        description: 'Promote to Junior Staff position',
        roleId: '1336741551548387418' // Example role ID
      },
      {
        id: 'staff',
        name: 'Staff',
        description: 'Promote to full Staff position',
        roleId: '1336741474708230164' // Example role ID
      },
      {
        id: 'senior_staff',
        name: 'Senior Staff',
        description: 'Promote to Senior Staff position',
        roleId: '1336741354428264488' // Example role ID
      }
    ],
    history: []
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('infractions')
    .setDescription('Manage server infractions and promotions')
    .addSubcommand(subcommand =>
      subcommand
        .setName('warn')
        .setDescription('Issue a warning to a user')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to warn')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for the warning')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('mute')
        .setDescription('Mute a user')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to mute')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for the mute')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('duration')
            .setDescription('Duration in hours (default: 1)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to kick')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for the kick')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to ban')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for the ban')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('duration')
            .setDescription('Duration in days (0 for permanent)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('history')
        .setDescription('View a user\'s infraction history')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to check')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('promote')
        .setDescription('Promote a user to a staff role')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to promote')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Role to assign')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for promotion')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('demote')
        .setDescription('Demote a user from a staff role')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to demote')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Role to remove')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for demotion')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Configure infraction system settings')
        .addChannelOption(option =>
          option.setName('log_channel')
            .setDescription('Channel for infraction logs')
            .setRequired(false))
        .addRoleOption(option =>
          option.setName('staff_role')
            .setDescription('Role that can manage infractions')
            .setRequired(false))
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable the infraction system')
            .setRequired(false)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const subcommand = interaction.options.getSubcommand();
      const staffRoleId = global.infractions.settings.staffRoleId;
      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
      const isStaff = interaction.member.roles.cache.has(staffRoleId) || isAdmin;

      // Only staff or admins can use these commands
      if (!isStaff) {
        return interaction.editReply('❌ You do not have permission to use this command!');
      }

      // Handle different subcommands
      switch (subcommand) {
        case 'warn':
          await handleWarn(interaction, client);
          break;
        case 'mute':
          await handleMute(interaction, client);
          break;
        case 'kick':
          await handleKick(interaction, client);
          break;
        case 'ban':
          await handleBan(interaction, client);
          break;
        case 'history':
          await handleHistory(interaction, client);
          break;
        case 'promote':
          await handlePromote(interaction, client);
          break;
        case 'demote':
          await handleDemote(interaction, client);
          break;
        case 'setup':
          // Only admins can configure the system
          if (!isAdmin) {
            return interaction.editReply('❌ Only administrators can configure the infraction system!');
          }
          await handleSetup(interaction, client);
          break;
        default:
          return interaction.editReply('❌ Unknown subcommand!');
      }
    } catch (error) {
      console.error('Error with infractions command:', error);
      await interaction.editReply('❌ There was an error executing this command!');
    }
  }
};

async function handleWarn(interaction, client) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');
  const moderator = interaction.user;
  
  // Create the infraction record
  const infraction = {
    id: generateInfractionId(),
    type: 'warning',
    userId: user.id,
    moderatorId: moderator.id,
    reason: reason,
    timestamp: Date.now(),
    active: true
  };
  
  // Save to the infraction history
  global.infractions.history.push(infraction);
  
  // Create an embed for the warning
  const warnEmbed = new EmbedBuilder()
    .setTitle('⚠️ Warning Issued')
    .setDescription(`${user} has been warned.`)
    .addFields(
      { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
      { name: 'Moderator', value: `${moderator.tag}`, inline: true },
      { name: 'Reason', value: reason }
    )
    .setColor(0xFFD700) // Gold color for warnings
    .setTimestamp();
  
  // Send the warning embed
  await interaction.editReply({ embeds: [warnEmbed] });
  
  // Try to DM the user
  try {
    const dmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Warning Received')
      .setDescription(`You have received a warning in ${interaction.guild.name}.`)
      .addFields(
        { name: 'Reason', value: reason },
        { name: 'Moderator', value: moderator.tag }
      )
      .setColor(0xFFD700)
      .setTimestamp();
    
    await user.send({ embeds: [dmEmbed] });
  } catch (error) {
    console.error(`Could not send DM to ${user.tag}:`, error);
    // Don't throw error for DM failures
  }
  
  // Log the infraction
  await logInfraction(interaction, client, infraction, warnEmbed);
}

async function handleMute(interaction, client) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');
  const hours = interaction.options.getInteger('duration') || 1;
  const moderator = interaction.user;
  
  // Find the member in the guild
  const member = await interaction.guild.members.fetch(user.id);
  if (!member) {
    return interaction.editReply('❌ User not found in this server!');
  }
  
  // Get the muted role from the infractions settings
  const muteReason = global.infractions.reasons.find(r => r.id === 'mute');
  const mutedRoleId = muteReason.roleId;
  
  // Check if the role exists
  const mutedRole = interaction.guild.roles.cache.get(mutedRoleId);
  if (!mutedRole) {
    return interaction.editReply('❌ Muted role not found! Please set up the muted role first.');
  }
  
  // Calculate duration
  const durationMs = hours * 60 * 60 * 1000; // Convert hours to milliseconds
  const expiresAt = Date.now() + durationMs;
  
  // Create the infraction record
  const infraction = {
    id: generateInfractionId(),
    type: 'mute',
    userId: user.id,
    moderatorId: moderator.id,
    reason: reason,
    timestamp: Date.now(),
    expiresAt: expiresAt,
    active: true
  };
  
  // Save to the infraction history
  global.infractions.history.push(infraction);
  
  // Apply the muted role
  await member.roles.add(mutedRoleId);
  
  // Create an embed for the mute
  const muteEmbed = new EmbedBuilder()
    .setTitle('🔇 User Muted')
    .setDescription(`${user} has been muted for ${hours} hour(s).`)
    .addFields(
      { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
      { name: 'Moderator', value: `${moderator.tag}`, inline: true },
      { name: 'Duration', value: `${hours} hour(s)`, inline: true },
      { name: 'Expires', value: `<t:${Math.floor(expiresAt / 1000)}:R>`, inline: true },
      { name: 'Reason', value: reason }
    )
    .setColor(0xFFA500) // Orange color for mutes
    .setTimestamp();
  
  // Send the mute embed
  await interaction.editReply({ embeds: [muteEmbed] });
  
  // Try to DM the user
  try {
    const dmEmbed = new EmbedBuilder()
      .setTitle('🔇 You Have Been Muted')
      .setDescription(`You have been muted in ${interaction.guild.name}.`)
      .addFields(
        { name: 'Duration', value: `${hours} hour(s)` },
        { name: 'Expires', value: `<t:${Math.floor(expiresAt / 1000)}:R>` },
        { name: 'Reason', value: reason },
        { name: 'Moderator', value: moderator.tag }
      )
      .setColor(0xFFA500)
      .setTimestamp();
    
    await user.send({ embeds: [dmEmbed] });
  } catch (error) {
    console.error(`Could not send DM to ${user.tag}:`, error);
    // Don't throw error for DM failures
  }
  
  // Log the infraction
  await logInfraction(interaction, client, infraction, muteEmbed);
  
  // Set a timeout to remove the mute after the duration
  setTimeout(async () => {
    try {
      const currentMember = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (currentMember) {
        await currentMember.roles.remove(mutedRoleId);
        
        // Update the infraction record
        const infractionRecord = global.infractions.history.find(i => i.id === infraction.id);
        if (infractionRecord) {
          infractionRecord.active = false;
        }
        
        // Log the automatic unmute
        const unmutedEmbed = new EmbedBuilder()
          .setTitle('🔊 User Automatically Unmuted')
          .setDescription(`${user} has been automatically unmuted after the mute duration.`)
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Original Mute Reason', value: reason }
          )
          .setColor(0x00FF00) // Green color for unmutes
          .setTimestamp();
        
        await logInfraction(interaction, client, infraction, unmutedEmbed);
      }
    } catch (error) {
      console.error('Error removing muted role after timeout:', error);
    }
  }, durationMs);
}

async function handleKick(interaction, client) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');
  const moderator = interaction.user;
  
  // Find the member in the guild
  const member = await interaction.guild.members.fetch(user.id);
  if (!member) {
    return interaction.editReply('❌ User not found in this server!');
  }
  
  // Check if the bot can kick the user
  if (!member.kickable) {
    return interaction.editReply('❌ I cannot kick this user! Check my permissions and role hierarchy.');
  }
  
  // Create the infraction record
  const infraction = {
    id: generateInfractionId(),
    type: 'kick',
    userId: user.id,
    moderatorId: moderator.id,
    reason: reason,
    timestamp: Date.now(),
    active: false // Kick is a one-time action
  };
  
  // Save to the infraction history
  global.infractions.history.push(infraction);
  
  // Create an embed for the kick
  const kickEmbed = new EmbedBuilder()
    .setTitle('👢 User Kicked')
    .setDescription(`${user} has been kicked from the server.`)
    .addFields(
      { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
      { name: 'Moderator', value: `${moderator.tag}`, inline: true },
      { name: 'Reason', value: reason }
    )
    .setColor(0xFF6347) // Tomato color for kicks
    .setTimestamp();
  
  // Try to DM the user before kicking
  try {
    const dmEmbed = new EmbedBuilder()
      .setTitle('👢 You Have Been Kicked')
      .setDescription(`You have been kicked from ${interaction.guild.name}.`)
      .addFields(
        { name: 'Reason', value: reason },
        { name: 'Moderator', value: moderator.tag }
      )
      .setColor(0xFF6347)
      .setTimestamp();
    
    await user.send({ embeds: [dmEmbed] });
  } catch (error) {
    console.error(`Could not send DM to ${user.tag}:`, error);
    // Don't throw error for DM failures
  }
  
  // Kick the user
  await member.kick(reason);
  
  // Send the kick embed
  await interaction.editReply({ embeds: [kickEmbed] });
  
  // Log the infraction
  await logInfraction(interaction, client, infraction, kickEmbed);
}

async function handleBan(interaction, client) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');
  const days = interaction.options.getInteger('duration') || 0;
  const moderator = interaction.user;
  
  // Create the infraction record
  const infraction = {
    id: generateInfractionId(),
    type: 'ban',
    userId: user.id,
    moderatorId: moderator.id,
    reason: reason,
    timestamp: Date.now(),
    active: true
  };
  
  // If days is greater than 0, it's a temporary ban
  if (days > 0) {
    infraction.type = 'tempban';
    const durationMs = days * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    infraction.expiresAt = Date.now() + durationMs;
  }
  
  // Save to the infraction history
  global.infractions.history.push(infraction);
  
  // Create an embed for the ban
  const banEmbed = new EmbedBuilder()
    .setTitle('🔨 User Banned')
    .setDescription(`${user} has been banned from the server.`)
    .addFields(
      { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
      { name: 'Moderator', value: `${moderator.tag}`, inline: true },
      { name: 'Type', value: days > 0 ? `Temporary (${days} days)` : 'Permanent', inline: true }
    )
    .setColor(0xFF0000) // Red color for bans
    .setTimestamp();
  
  if (days > 0) {
    banEmbed.addFields(
      { name: 'Expires', value: `<t:${Math.floor(infraction.expiresAt / 1000)}:R>`, inline: true }
    );
  }
  
  banEmbed.addFields({ name: 'Reason', value: reason });
  
  // Try to DM the user before banning
  try {
    const dmEmbed = new EmbedBuilder()
      .setTitle('🔨 You Have Been Banned')
      .setDescription(`You have been banned from ${interaction.guild.name}.`)
      .addFields(
        { name: 'Type', value: days > 0 ? `Temporary (${days} days)` : 'Permanent' },
        { name: 'Reason', value: reason },
        { name: 'Moderator', value: moderator.tag }
      )
      .setColor(0xFF0000)
      .setTimestamp();
      
    if (days > 0) {
      dmEmbed.addFields(
        { name: 'Expires', value: `<t:${Math.floor(infraction.expiresAt / 1000)}:F>` }
      );
    }
    
    await user.send({ embeds: [dmEmbed] });
  } catch (error) {
    console.error(`Could not send DM to ${user.tag}:`, error);
    // Don't throw error for DM failures
  }
  
  // Ban the user
  try {
    await interaction.guild.members.ban(user, { reason: reason });
    
    // Send the ban embed
    await interaction.editReply({ embeds: [banEmbed] });
    
    // Log the infraction
    await logInfraction(interaction, client, infraction, banEmbed);
    
    // If it's a temporary ban, set a timeout to unban
    if (days > 0) {
      const durationMs = days * 24 * 60 * 60 * 1000;
      setTimeout(async () => {
        try {
          await interaction.guild.members.unban(user.id, 'Temporary ban expired');
          
          // Update the infraction record
          const infractionRecord = global.infractions.history.find(i => i.id === infraction.id);
          if (infractionRecord) {
            infractionRecord.active = false;
          }
          
          // Log the automatic unban
          const unbanEmbed = new EmbedBuilder()
            .setTitle('🔓 User Automatically Unbanned')
            .setDescription(`${user} has been automatically unbanned after the ban duration.`)
            .addFields(
              { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
              { name: 'Original Ban Reason', value: reason }
            )
            .setColor(0x00FF00) // Green color for unbans
            .setTimestamp();
            
          await logInfraction(interaction, client, infractionRecord, unbanEmbed);
        } catch (error) {
          console.error('Error unbanning user after timeout:', error);
        }
      }, durationMs);
    }
  } catch (error) {
    console.error('Error banning user:', error);
    await interaction.editReply('❌ There was an error banning this user!');
  }
}

async function handleHistory(interaction, client) {
  const user = interaction.options.getUser('user');
  
  // Get all infractions for this user
  const userInfractions = global.infractions.history.filter(i => i.userId === user.id);
  
  if (userInfractions.length === 0) {
    return interaction.editReply(`✅ ${user.tag} has no infractions on record.`);
  }
  
  // Sort infractions by timestamp (newest first)
  userInfractions.sort((a, b) => b.timestamp - a.timestamp);
  
  // Create an embed for the infraction history
  const historyEmbed = new EmbedBuilder()
    .setTitle(`Infraction History: ${user.tag}`)
    .setDescription(`${user} has ${userInfractions.length} infraction(s) on record.`)
    .setColor(0x9B59B6)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setTimestamp();
  
  // Add the most recent 10 infractions
  const recentInfractions = userInfractions.slice(0, 10);
  
  for (const infraction of recentInfractions) {
    let moderator = 'Unknown';
    try {
      const mod = await client.users.fetch(infraction.moderatorId);
      moderator = mod.tag;
    } catch (error) {
      console.error('Error fetching moderator:', error);
    }
    
    const fieldName = `${infraction.type.charAt(0).toUpperCase() + infraction.type.slice(1)} - ${new Date(infraction.timestamp).toLocaleDateString()}`;
    let fieldValue = `• Reason: ${infraction.reason}\n• Moderator: ${moderator}\n• Status: ${infraction.active ? 'Active' : 'Resolved'}`;
    
    if (infraction.expiresAt) {
      fieldValue += `\n• Expires: <t:${Math.floor(infraction.expiresAt / 1000)}:R>`;
    }
    
    historyEmbed.addFields({ name: fieldName, value: fieldValue });
  }
  
  // Add summary information
  const typeCounts = {};
  for (const infraction of userInfractions) {
    typeCounts[infraction.type] = (typeCounts[infraction.type] || 0) + 1;
  }
  
  let summaryText = 'Summary:\n';
  for (const [type, count] of Object.entries(typeCounts)) {
    summaryText += `• ${type.charAt(0).toUpperCase() + type.slice(1)}: ${count}\n`;
  }
  
  historyEmbed.addFields({ name: 'Infraction Summary', value: summaryText });
  
  // Send the history embed
  await interaction.editReply({ embeds: [historyEmbed] });
}

async function handlePromote(interaction, client) {
  const user = interaction.options.getUser('user');
  const role = interaction.options.getRole('role');
  const reason = interaction.options.getString('reason');
  const moderator = interaction.user;
  
  // Find the member in the guild
  const member = await interaction.guild.members.fetch(user.id);
  if (!member) {
    return interaction.editReply('❌ User not found in this server!');
  }
  
  // Check if the bot can manage this role
  if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.editReply('❌ I don\'t have permission to manage roles!');
  }
  
  if (role.position >= interaction.guild.members.me.roles.highest.position) {
    return interaction.editReply('❌ I cannot assign roles that are higher than or equal to my highest role!');
  }
  
  // Create the promotion record
  const promotion = {
    id: generateInfractionId(),
    type: 'promotion',
    userId: user.id,
    moderatorId: moderator.id,
    reason: reason,
    roleId: role.id,
    roleName: role.name,
    timestamp: Date.now()
  };
  
  // Save to the infraction history for tracking
  global.infractions.history.push(promotion);
  
  // Add the role to the member
  await member.roles.add(role);
  
  // Create an embed for the promotion
  const promoteEmbed = new EmbedBuilder()
    .setTitle('🌟 User Promoted')
    .setDescription(`${user} has been promoted to ${role}.`)
    .addFields(
      { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
      { name: 'Role', value: `${role.name}`, inline: true },
      { name: 'Moderator', value: `${moderator.tag}`, inline: true },
      { name: 'Reason', value: reason }
    )
    .setColor(0x00FF00) // Green color for promotions
    .setTimestamp();
  
  // Send the promotion embed
  await interaction.editReply({ embeds: [promoteEmbed] });
  
  // Try to DM the user
  try {
    const dmEmbed = new EmbedBuilder()
      .setTitle('🌟 You Have Been Promoted')
      .setDescription(`You have been promoted in ${interaction.guild.name}.`)
      .addFields(
        { name: 'New Role', value: role.name },
        { name: 'Reason', value: reason },
        { name: 'Promoted By', value: moderator.tag }
      )
      .setColor(0x00FF00)
      .setTimestamp();
    
    await user.send({ embeds: [dmEmbed] });
  } catch (error) {
    console.error(`Could not send DM to ${user.tag}:`, error);
    // Don't throw error for DM failures
  }
  
  // Log the promotion
  await logInfraction(interaction, client, promotion, promoteEmbed);
}

async function handleDemote(interaction, client) {
  const user = interaction.options.getUser('user');
  const role = interaction.options.getRole('role');
  const reason = interaction.options.getString('reason');
  const moderator = interaction.user;
  
  // Find the member in the guild
  const member = await interaction.guild.members.fetch(user.id);
  if (!member) {
    return interaction.editReply('❌ User not found in this server!');
  }
  
  // Check if the user has the role
  if (!member.roles.cache.has(role.id)) {
    return interaction.editReply('❌ The user does not have this role!');
  }
  
  // Check if the bot can manage this role
  if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.editReply('❌ I don\'t have permission to manage roles!');
  }
  
  if (role.position >= interaction.guild.members.me.roles.highest.position) {
    return interaction.editReply('❌ I cannot remove roles that are higher than or equal to my highest role!');
  }
  
  // Create the demotion record
  const demotion = {
    id: generateInfractionId(),
    type: 'demotion',
    userId: user.id,
    moderatorId: moderator.id,
    reason: reason,
    roleId: role.id,
    roleName: role.name,
    timestamp: Date.now()
  };
  
  // Save to the infraction history for tracking
  global.infractions.history.push(demotion);
  
  // Remove the role from the member
  await member.roles.remove(role);
  
  // Create an embed for the demotion
  const demoteEmbed = new EmbedBuilder()
    .setTitle('⬇️ User Demoted')
    .setDescription(`${user} has been demoted from ${role}.`)
    .addFields(
      { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
      { name: 'Role Removed', value: `${role.name}`, inline: true },
      { name: 'Moderator', value: `${moderator.tag}`, inline: true },
      { name: 'Reason', value: reason }
    )
    .setColor(0xFF6347) // Tomato color for demotions
    .setTimestamp();
  
  // Send the demotion embed
  await interaction.editReply({ embeds: [demoteEmbed] });
  
  // Try to DM the user
  try {
    const dmEmbed = new EmbedBuilder()
      .setTitle('⬇️ You Have Been Demoted')
      .setDescription(`You have been demoted in ${interaction.guild.name}.`)
      .addFields(
        { name: 'Removed Role', value: role.name },
        { name: 'Reason', value: reason },
        { name: 'Demoted By', value: moderator.tag }
      )
      .setColor(0xFF6347)
      .setTimestamp();
    
    await user.send({ embeds: [dmEmbed] });
  } catch (error) {
    console.error(`Could not send DM to ${user.tag}:`, error);
    // Don't throw error for DM failures
  }
  
  // Log the demotion
  await logInfraction(interaction, client, demotion, demoteEmbed);
}

async function handleSetup(interaction, client) {
  const logChannel = interaction.options.getChannel('log_channel');
  const staffRole = interaction.options.getRole('staff_role');
  const enabled = interaction.options.getBoolean('enabled');
  
  // Update settings if provided
  if (logChannel !== null) {
    global.infractions.settings.logChannelId = logChannel.id;
  }
  
  if (staffRole !== null) {
    global.infractions.settings.staffRoleId = staffRole.id;
  }
  
  if (enabled !== null) {
    global.infractions.settings.enabled = enabled;
  }
  
  // Create an embed for the setup
  const setupEmbed = new EmbedBuilder()
    .setTitle('⚙️ Infraction System Configuration')
    .setDescription('The infraction system settings have been updated.')
    .addFields(
      { name: 'Status', value: global.infractions.settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Log Channel', value: global.infractions.settings.logChannelId ? `<#${global.infractions.settings.logChannelId}>` : 'Not set', inline: true },
      { name: 'Staff Role', value: global.infractions.settings.staffRoleId ? `<@&${global.infractions.settings.staffRoleId}>` : 'Not set', inline: true }
    )
    .setColor(0x9B59B6) // Purple color for setup
    .setTimestamp();
  
  // Send the setup embed
  await interaction.editReply({ embeds: [setupEmbed] });
}

async function logInfraction(interaction, client, infraction, embed) {
  // Check if a log channel is configured
  const logChannelId = global.infractions.settings.logChannelId;
  if (!logChannelId) return;
  
  try {
    const logChannel = await interaction.guild.channels.fetch(logChannelId);
    if (logChannel) {
      await logChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Error logging infraction:', error);
  }
}

function generateInfractionId() {
  return crypto.randomBytes(4).toString('hex');
}
