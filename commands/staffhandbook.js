
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffhandbook')
    .setDescription('View the comprehensive staff handbook with command usage'),

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

      // Create the main handbook embed
      const handbookEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **STAFF HANDBOOK**')
        .setDescription('***Complete guide for all staff commands and their proper usage***')
        .setColor(0x9B59B6)
        .setTimestamp();

      // Owner-only commands section
      handbookEmbed.addFields(
        {
          name: '**__👑 OWNER-ONLY COMMANDS__**',
          value: '```\nThese commands can only be used by server owners.\n```'
        },
        {
          name: '**🔨 `/ban`**',
          value: '> Permanently bans a user from the server\n> **Usage:** `/ban user:@user reason:Reason`\n> **Permissions:** Owner Only'
        },
        {
          name: '**👢 `/kick`**',
          value: '> Kicks a user from the server\n> **Usage:** `/kick user:@user reason:Reason`\n> **Permissions:** Owner Only'
        },
        {
          name: '**📢 `/dmall`**',
          value: '> Sends a message to all server members\n> **Usage:** `/dmall message:Your announcement`\n> **Permissions:** Owner Only'
        }
      );

      // Staff-only commands section
      handbookEmbed.addFields(
        {
          name: '**__👮 STAFF COMMANDS__**',
          value: '```\nThese commands can be used by all staff members.\n```'
        },
        {
          name: '**🎫 `/ticketmaker`**',
          value: '> Creates a ticket panel in the current channel\n> **Usage:** `/ticketmaker`\n> **Permissions:** Staff Only'
        },
        {
          name: '**🔑 `/generatekey`**',
          value: '> Generates a unique key for a customer\n> **Usage:** `/generatekey user:@user accounts:15 queue_position:1 estimated_wait:5`\n> **Permissions:** Staff Only'
        },
        {
          name: '**🚀 `/orderstart`**',
          value: '> Starts service for a customer (assigns Customer role automatically)\n> **Usage:** `/orderstart user:@user accounts:15 key:ABC123 server_code:erlccode`\n> **Note:** Automatically assigns the Alting Customer role\n> **Permissions:** Staff Only'
        },
        {
          name: '**🔄 `/reactivateid`**',
          value: '> Reactivates an order using the order ID\n> **Usage:** `/reactivateid orderid:ORDER-12345 server_code:ABCXYZ`\n> **Permissions:** Staff Only'
        },
        {
          name: '**⏹️ `/orderend`**',
          value: '> Ends service for a customer\n> **Usage:** `/orderend orderid:ORDER12345 users:@user1,@user2 durations:2,3`\n> **Permissions:** Staff Only'
        },
        {
          name: '**❌ `/ordercancel`**',
          value: '> Cancels an active order\n> **Usage:** `/ordercancel orderid:ORDER12345 reason:Customer requested`\n> **Permissions:** Staff Only'
        },
        {
          name: '**📋 `/orderhistory`**',
          value: '> View order history for a user\n> **Usage:** `/orderhistory user:@user`\n> **Permissions:** Staff Only'
        },
        {
          name: '**🧩 `/orderid`**',
          value: '> Gets order information by ID\n> **Usage:** `/orderid id:ORDER12345`\n> **Permissions:** Staff Only'
        },
        {
          name: '**🔇 `/softban`**',
          value: '> Temporarily restricts a user from services\n> **Usage:** `/softban user:@user duration:7 reason:Reason`\n> **Permissions:** Staff Only'
        },
        {
          name: '**👥 `/role`**',
          value: '> Assigns a role to a user\n> **Usage:** `/role user:@user role:@role reason:Reason`\n> **Permissions:** Staff Only'
        }
      );

      // Shift management section
      handbookEmbed.addFields(
        {
          name: '**__⏲️ SHIFT MANAGEMENT__**',
          value: '```\nCommands for managing staff shifts.\n```'
        },
        {
          name: '**🕒 `/shiftstart`**',
          value: '> Start your shift as staff\n> **Usage:** `/shiftstart`\n> **Permissions:** Staff Only'
        },
        {
          name: '**🕕 `/shiftend`**',
          value: '> End your current shift\n> **Usage:** `/shiftend`\n> **Permissions:** Staff Only'
        }
      );

      // Important notes section
      handbookEmbed.addFields(
        {
          name: '**__📌 IMPORTANT STAFF PROTOCOLS__**',
          value: '```\n1. Always verify order proof before generating keys\n2. Ensure correct order information before starting service\n3. Keep customer information strictly confidential\n4. Report any suspicious activity to owners immediately\n5. Update the order status in tickets when appropriate\n6. Never share your staff account or credentials\n7. Always use /role to assign roles properly\n8. Monitor the order list channel for ticket activity notifications\n```'
        },
        {
          name: '**__📢 ORDER LIST CHANNEL__**',
          value: '```\nThe order list channel (#order-list) tracks all ticket activities:\n• When tickets are claimed\n• When order proofs are submitted\n• When keys are generated\n• When orders start and end\n\nYou will be pinged in this channel when actions are taken.\n```'
        },
        {
          name: '**__⚠️ TROUBLESHOOTING__**',
          value: '```\n• If role assignment fails, use /role command manually\n• If /orderstart fails, check permissions and try again\n• For any bot issues, contact the server owners\n```'
        }
      );

      await interaction.editReply({ embeds: [handbookEmbed] });
    } catch (error) {
      console.error('Error displaying staff handbook:', error);
      await interaction.editReply('❌ There was an error displaying the staff handbook!');
    }
  }
};
