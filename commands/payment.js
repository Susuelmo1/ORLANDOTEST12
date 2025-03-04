
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('payment')
    .setDescription('Get payment information'),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // Create a payment embed with instructions
      const paymentEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **PAYMENT INFORMATION**')
        .setDescription(`***Here are our payment links for all products***`)
        .addFields(
          { name: '**<:PurpleLine:1336946927282950165> __Payment Links__**', 
            value: '> **40 Bots:** [Click Here](https://www.roblox.com/catalog/109981296260142)\n> **30 Bots:** [Click Here](https://www.roblox.com/catalog/138973868529963)\n> **25 Bots:** [Click Here](https://www.roblox.com/catalog/114907246125026)\n> **20 Bots:** [Click Here](https://www.roblox.com/catalog/90251095378460)\n> **15 Bots:** [Click Here](https://www.roblox.com/catalog/114311203640066)\n> **10 Bots:** [Click Here](https://www.roblox.com/catalog/110507656911368)'
          },
          { name: '**<:PurpleLine:1336946927282950165> __Full Server__**', 
            value: '> **Full Server:** [Click Here](https://www.roblox.com/catalog/101932399625607)\n> **Refill:** [Click Here](https://www.roblox.com/catalog/133192264732348)'
          },
          { name: '**<:PurpleLine:1336946927282950165> __VIP__**', 
            value: '> **Lifetime:** [Click Here](https://www.roblox.com/catalog/98202400395342)\n> **Month:** [Click Here](https://www.roblox.com/catalog/85144990668024)\n> **Week:** [Click Here](https://www.roblox.com/catalog/87544796577389)'
          },
          { name: '**`Step 1️⃣ – Make Your Purchase`**', 
            value: '> Select the appropriate package link above and complete your purchase'
          },
          { name: '**`Step 2️⃣ – Provide Order Proof`**', 
            value: '> After purchasing, use `/orderproof` with:\n> • Your Roblox username\n> • Screenshot of purchase\n> • The package you bought'
          },
          { name: '**`Step 3️⃣ – Wait for Key`**', 
            value: '> Staff will verify your purchase and generate your key'
          }
        )
        .setColor(0x9B59B6)
        .setTimestamp();

      await interaction.editReply({ embeds: [paymentEmbed] });

    } catch (error) {
      console.error('Error with payment command:', error);
      await interaction.editReply('❌ There was an error displaying payment information!');
    }
  }
};
