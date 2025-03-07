const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffguide')
    .setDescription('View the staff guide for bot commands'),

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

      // Create a staff guide embed
      const staffGuideEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **STAFF COMMAND GUIDE**')
        .setDescription('***This guide contains information about all staff commands and their usage.***')
        .setColor(0x9B59B6)
        .setTimestamp();

      // Add ticket handling section
      staffGuideEmbed.addFields(
        {
          name: '**__📝 TICKET HANDLING__**',
          value: '```\nTicket handling commands for staff members.\n```'
        },
        {
          name: '**💬 `/ticketmaker`**',
          value: '> Creates a ticket panel in the current channel.\n> **Usage:** `/ticketmaker`'
        }
      );

      // Add order management section
      staffGuideEmbed.addFields(
        {
          name: '**__🛒 ORDER MANAGEMENT__**',
          value: '```\nCommands for managing customer orders.\n```'
        },
        {
          name: '**🔑 `/generatekey`**',
          value: '> Generates a unique key for a customer.\n> **Usage:** `/generatekey user:@user accounts:15 queue_position:1 estimated_wait:5`'
        },
        {
          name: '**🚀 `/orderstart`**',
          value: '> Starts service for a customer with Roblox accounts.\n> **Usage:** `/orderstart user:@user accounts:15 key:ABC123 server_code:erlccode`'
        },
        {
          name: '**🔄 `/reactivateid`**',
          value: '> Reactivates an order using just the order ID\n> **Usage:** `/reactivateid orderid:ORDER-12345 server_code:ABCXYZ`',
        },
        {
          name: '**⏹️ `/orderend`**',
          value: '> Ends service for a customer.\n> **Usage:** `/orderend orderid:ORDER12345 users:@user1,@user2 durations:2,3`'
        },
        {
          name: '**❌ `/ordercancel`**',
          value: '> Cancels an active order.\n> **Usage:** `/ordercancel orderid:ORDER12345 reason:Customer requested`'
        },
        {
          name: '**📋 `/orderhistory`**',
          value: '> View order history for a user.\n> **Usage:** `/orderhistory user:@user`'
        },
        {
          name: '**🧩 `/orderid`**',
          value: '> Gets order information by ID.\n> **Usage:** `/orderid id:ORDER12345`'
        }
      );

      // Add shift management section
      staffGuideEmbed.addFields(
        {
          name: '**__⏲️ SHIFT MANAGEMENT__**',
          value: '```\nCommands for managing staff shifts.\n```'
        },
        {
          name: '**🕒 `/shiftstart`**',
          value: '> Start your shift as staff.\n> **Usage:** `/shiftstart`'
        },
        {
          name: '**🕕 `/shiftend`**',
          value: '> End your current shift.\n> **Usage:** `/shiftend`'
        }
      );

      // Add moderation section
      staffGuideEmbed.addFields(
        {
          name: '**__🛡️ MODERATION__**',
          value: '```\nCommands for server moderation (Owner only).\n```'
        },
        {
          name: '**🔨 `/ban`**',
          value: '> Ban a user from the server.\n> **Usage:** `/ban user:@user reason:Reason`\n> **Note:** Owner only'
        },
        {
          name: '**👢 `/kick`**',
          value: '> Kick a user from the server.\n> **Usage:** `/kick user:@user reason:Reason`\n> **Note:** Owner only'
        },
        {
          name: '**🔇 `/softban`**',
          value: '> Temporarily ban a user from using services.\n> **Usage:** `/softban user:@user duration:7 reason:Reason`'
        }
      );

      // Add server setup section
      staffGuideEmbed.addFields(
        {
          name: '**__⚙️ SERVER SETUP__**',
          value: '```\nCommands for server setup (Owner only).\n```'
        },
        {
          name: '**🔧 `/setup webhook`**',
          value: '> Set up logging webhook.\n> **Usage:** `/setup webhook url:webhookurl`\n> **Note:** Owner only'
        },
        {
          name: '**👥 `/setup staffrole`**',
          value: '> Set the staff role.\n> **Usage:** `/setup staffrole role:@role`\n> **Note:** Owner only'
        }
      );

      // Add important notes section
      staffGuideEmbed.addFields(
        {
          name: '**__📌 IMPORTANT NOTES__**',
          value: '```\n1. Always verify order proof before generating keys.\n2. Ensure correct order information before starting service.\n3. Keep customer information confidential.\n4. Report any suspicious activity to owners.\n5. Update the order status in tickets when appropriate.\n```'
        }
      );

      await interaction.editReply({ embeds: [staffGuideEmbed] });
    } catch (error) {
      console.error('Error displaying staff guide:', error);
      await interaction.editReply('❌ There was an error displaying the staff guide!');
    }
  }
};