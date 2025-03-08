const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: {
    name: 'rules'
  },

  execute(interaction) {
    const rulesEmbed = new EmbedBuilder()
      .setTitle('📜 ERLC Alting Rules')
      .setDescription(
        'Welcome to **ERLC ALTING SERVER**! Please follow the rules below to maintain a respectful and friendly environment.\n\n' +
        '**Breaking these rules may result in warnings and penalties.**'
      )
      .addFields(
        { 
          name: '<:1_:1337594940179353681> **Respect**',
          value: 'Treat everyone with respect. Disrespect of any kind will not be tolerated.\n<:PurpleLine:1336946927282950165>'
        },
        { 
          name: '<:2_:1337594974233165958> **Bullying & Harassment**',
          value: 'Bullying, harassment, and targeting members are strictly prohibited.\n<:PurpleLine:1336946927282950165>'
        },
        { 
          name: '<:3_:1337595007548264448> **Advertising**',
          value: 'Advertising in any form, including DM advertising, is not allowed.\n<:PurpleLine:1336946927282950165>'
        },
        { 
          name: '<:4_:1337594940179353681> **Discord Terms of Service**',
          value: 'You must comply with the [Discord Terms of Service](https://discord.com/terms) at all times.\n<:PurpleLine:1336946927282950165>'
        },
        { 
          name: '<:5_:1337594974233165958> **Pinging Staff**',
          value: 'Avoid excessive pinging of staff. Use the ticket system for support.\n<:PurpleLine:1336946927282950165>'
        },
        { 
          name: '<:6_:1337595007548264448> **Channel Usage**',
          value: 'Use channels for their intended purposes (e.g., media for Media posts).\n<:PurpleLine:1337594940179353681>'
        },
        { 
          name: '<:7_:1337594974233165958> **Private Information**',
          value: 'Do not share personal information. Violations will be met with harsh moderation.\n<:PurpleLine:1337594940179353681>'
        }
      )
      .addFields(
        { 
          name: '⚠️ **Penalties**',
          value: '**3 Warnings:** Softban/Kick\n**6 Warnings:** Temp Ban (6-12 Days)\n**8 Warnings:** Permanent Ban'
        }
      )
      .setColor('#6A0DAD') // Aesthetic purple color
      .setFooter({ text: 'Thank you for following the rules and making this a great community!' });

    interaction.reply({ embeds: [rulesEmbed], ephemeral: true }); // Reply privately
  }
};
