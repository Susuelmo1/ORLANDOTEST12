
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('payment')
    .setDescription('Show payment links'),

  async execute(interaction) {
    try {
      // Check if in a ticket channel
      if (interaction.channel && !interaction.channel.name.includes('ticket')) {
        return interaction.reply({ content: '❌ This command can only be used in a ticket channel!', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('<:alting:1336938112261029978> **PAYMENT LINKS**')
        .setDescription('***Please select one of the following payment options:***')
        .setColor(0x9B59B6)
        .addFields(
          {
            name: '**<:1_:1337594940179353681> __Payment Links__**',
            value: '> **40 Bots:** [Copy Me](https://www.roblox.com/catalog/109981296260142)\n> **30 Bots:** [Copy Me](https://www.roblox.com/catalog/138973868529963)\n> **25 Bots:** [Copy Me](https://www.roblox.com/catalog/114907246125026)\n> **20 Bots:** [Copy Me](https://www.roblox.com/catalog/90251095378460)\n> **15 Bots:** [Copy Me](https://www.roblox.com/catalog/114311203640066)\n> **10 Bots:** [Copy Me](https://www.roblox.com/catalog/110507656911368)'
          },
          {
            name: '**<:2_:1337594974233165958> __Full Server__**',
            value: '> **Full Server:** [Copy Me](https://www.roblox.com/catalog/101932399625607)\n> **Refill:** [Copy Me](https://www.roblox.com/catalog/133192264732348)'
          },
          {
            name: '**<:3_:1337595007548264448> __VIP__**',
            value: '> **Lifetime:** [Copy Me](https://www.roblox.com/catalog/98202400395342)\n> **Month:** [Copy Me](https://www.roblox.com/catalog/85144990668024)\n> **Week:** [Copy Me](https://www.roblox.com/catalog/87544796577389)'
          },
          {
            name: '**<:4_:1337595034509250582> __Next Steps__**',
            value: '> After purchasing, use `/orderproof` to submit your:\n> • **Roblox username**\n> • **Screenshot of the purchase**\n> • **Package type**'
          }
        )
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setFooter({ text: 'ERLC Alting Support' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error displaying payment links:', error);
      await interaction.reply({ content: '❌ An error occurred while displaying payment links.', ephemeral: true });
    }
  }
};
