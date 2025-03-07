
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tos')
    .setDescription('Display terms of service in the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Display terms of service in the current channel
      const channel = interaction.channel;

      const tosEmbed = new EmbedBuilder()
        .setTitle('Terms of Service')
        .setDescription('<:alting:1337594940179353681> Welcome to ERLC Alting! By participating in our server and using our services, you agree to the following terms:')
        .addFields(
          { 
            name: '**General Rules**',
            value: '<:1_:1337594940179353681> **Compliance:** You must follow Discord\'s Terms of Service and Community Guidelines at all times.\n\n<:2_:1337594974233165958> **Respect:** Treat all members and staff with respect. Harassment, hate speech, or discrimination of any kind is strictly prohibited.\n\n<:3_:1337595007548264448> **Honesty:** Do not use fake information or impersonate others while using our services.\n<:PurpleLine:1336946927282950165>'
          },
          { 
            name: '**Service Terms**',
            value: '<:purplearrow:1337594384631332885> Our alting services are limited to Emergency Response: Liberty County (ERLC).\n\n<:purplearrow:1337594384631332885> Alts provided are for private server use only and must comply with ERLC\'s rules.\n\n<:purplearrow:1337594384631332885> Sharing or reselling alts is strictly prohibited.\n<:PurpleLine:1336946927282950165>'
          },
          { 
            name: '**Payments**',
            value: '<:purplearrow:1337594384631332885> All payments must be completed before services are provided.\n\n<:purplearrow:1337594384631332885> Refunds are not allowed unless a service cannot be delivered.\n\n<:purplearrow:1337594384631332885> Prices are subject to change, and you are responsible for covering the 30% Roblox tax.\n<:PurpleLine:1336946927282950165>'
          },
          { 
            name: '**Liability**',
            value: '<:purplearrow:1337594384631332885> We are not responsible for any account bans, restrictions, or consequences due to misuse of alts.\n\n<:purplearrow:1337594384631332885> Use our services at your own risk.\n<:PurpleLine:1336946927282950165>'
          },
          { 
            name: '**User Conduct**',
            value: '<:purplearrow:1337594384631332885> Do not abuse the ticket system or spam staff members.\n\n<:purplearrow:1337594384631332885> Keep all conversations in their appropriate channels.\n\n<:purplearrow:1337594384631332885> Refrain from using alt accounts unless explicitly authorized.\n<:PurpleLine:1336946927282950165>'
          },
          { 
            name: '**Privacy Policy**',
            value: '<:purplearrow:1337594384631332885> Your personal information (e.g., payment details) will not be shared with third parties.\n\n<:purplearrow:1337594384631332885> Do not share or request personal information within this server.\n<:PurpleLine:1336946927282950165>'
          },
          { 
            name: '**Violations**',
            value: '<:purplearrow:1337594384631332885> Breaking any of these terms will result in warnings, temporary bans, or permanent bans depending on the severity.\n\n<:purplearrow:1337594384631332885> Serious violations (e.g., harassment, illegal activities) may be reported to Discord.'
          }
        )
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setThumbnail('https://media.discordapp.net/attachments/1336783170422571008/1336938605578289234/Screenshot_2025-02-05_at_10.08.18_PM-removebg-preview.png')
        .setColor(0x9B59B6);

      await channel.send({ embeds: [tosEmbed] });
      await interaction.editReply('✅ Terms of Service posted successfully!');

    } catch (error) {
      console.error('Error posting ToS:', error);
      await interaction.editReply('❌ An error occurred while posting the Terms of Service. Error: ' + error.message);
    }
  }
};
