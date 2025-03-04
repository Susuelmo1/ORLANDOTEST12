const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('payment')
    .setDescription('Shows payment methods and information'),

  async execute(interaction) {
    const paymentEmbed = new EmbedBuilder()
      .setTitle('<:alting:1336938112261029978> **__Payment Methods__**')
      .setDescription('***Complete your purchase using one of the following links:***')
      .addFields(
        { 
          name: '<:1_:1337594940179353681> **Bot Service Options**',
          value: '> **40 Bots:** [Copy Me](https://www.roblox.com/catalog/109981296260142)\n> **30 Bots:** [Copy Me](https://www.roblox.com/catalog/138973868529963)\n> **25 Bots:** [Copy Me](https://www.roblox.com/catalog/114907246125026)\n> **20 Bots:** [Copy Me](https://www.roblox.com/catalog/90251095378460)\n> **15 Bots:** [Copy Me](https://www.roblox.com/catalog/114311203640066)\n> **10 Bots:** [Copy Me](https://www.roblox.com/catalog/110507656911368)'
        },
        { 
          name: '<:2_:1337594974233165958> **Full Server Service**',
          value: '> **Full Server:** [Copy Me](https://www.roblox.com/catalog/101932399625607)\n> **Refill:** [Copy Me](https://www.roblox.com/catalog/133192264732348)'
        },
        { 
          name: '<:3_:1337595007548264448> **VIP Packages**',
          value: '> **Lifetime:** [Copy Me](https://www.roblox.com/catalog/98202400395342)\n> **Month:** [Copy Me](https://www.roblox.com/catalog/85144990668024)\n> **Week:** [Copy Me](https://www.roblox.com/catalog/87544796577389)'
        },
        {
          name: '<:4_:1337595034509250582> **After Purchase**',
          value: '> Use `/orderproof` to submit your proof of purchase\n> Staff will generate your key and finalize your order\n> Your key will be strictly confidential - do not share!'
        }
      )
      .setColor(0x9B59B6)
      .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
      .setFooter({ text: 'ERLC Alting Support' });

    await interaction.reply({ embeds: [paymentEmbed] });
  },
};