
const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketmaker')
    .setDescription('Create a ticket panel in the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Set up the ticket panel in the current channel
      const channel = interaction.channel;

      const embed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **CHOOSE YOUR TICKET TYPE**')
        .setDescription('***Click one of the buttons below to create a ticket!***')
        .addFields(
          { 
            name: '**1️⃣ Order Alts**',
            value: '> Create this ticket if you would like to order alts.'
          },
          { 
            name: '**2️⃣ General Support**',
            value: '> Create this ticket if you need general support or have any questions.'
          },
          { 
            name: '**3️⃣ VIP Order**',
            value: '> Create this ticket if you would like to order VIP services.'
          },
          { 
            name: '**<:PurpleLine:1336946927282950165> __Payment Links__**',
            value: '> **40 Bots:** [Copy Me](https://www.roblox.com/catalog/109981296260142)\n> **30 Bots:** [Copy Me](https://www.roblox.com/catalog/138973868529963)\n> **25 Bots:** [Copy Me](https://www.roblox.com/catalog/114907246125026)\n> **20 Bots:** [Copy Me](https://www.roblox.com/catalog/90251095378460)\n> **15 Bots:** [Copy Me](https://www.roblox.com/catalog/114311203640066)\n> **10 Bots:** [Copy Me](https://www.roblox.com/catalog/110507656911368)'
          },
          { 
            name: '**<:PurpleLine:1336946927282950165> __Full Server__**',
            value: '> **Full Server:** [Copy Me](https://www.roblox.com/catalog/101932399625607)\n> **Refill:** [Copy Me](https://www.roblox.com/catalog/133192264732348)'
          },
          { 
            name: '**<:PurpleLine:1336946927282950165> __VIP__**',
            value: '> **Lifetime:** [Copy Me](https://www.roblox.com/catalog/98202400395342)\n> **Month:** [Copy Me](https://www.roblox.com/catalog/85144990668024)\n> **Week:** [Copy Me](https://www.roblox.com/catalog/87544796577389)'
          }
        )
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setFooter({ text: '⚠️ Warning: You can only create 10 ticket(s) at a time!' })
        .setColor(0x9B59B6); // Dark purple color

      // Create proper Discord.js components
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('create_ticket_order')
            .setLabel('Order Alts')
            .setEmoji('1️⃣')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('create_ticket_support')
            .setLabel('General Support')
            .setEmoji('2️⃣')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('create_ticket_vip')
            .setLabel('VIP Order')
            .setEmoji('3️⃣')
            .setStyle(ButtonStyle.Success)
        );

      await channel.send({ embeds: [embed], components: [row] });
      await interaction.editReply('✅ Ticket panel created successfully!');

    } catch (error) {
      console.error('Error creating ticket panel:', error);
      await interaction.editReply('❌ An error occurred while creating the ticket panel. Error: ' + error.message);
    }
  }
};
