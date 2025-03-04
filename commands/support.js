
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Display support information and usage guide'),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // Create a detailed support guide
      const supportEmbed = new EmbedBuilder()
        .setTitle('📚 HOW TO USE THE BOT')
        .setDescription('Here\'s a step-by-step guide on how to complete your order:')
        .addFields(
          { 
            name: '`Step 1️⃣ - Start Order Process`', 
            value: '> **Use `/orderproof` command**\n> Type `/orderproof` and provide your Roblox username when prompted.'
          },
          { 
            name: '`Step 2️⃣ - Select Product`', 
            value: '> **Choose from available products**\n> Click on one of the product buttons that appears after using the orderproof command.'
          },
          { 
            name: '`Step 3️⃣ - Complete Payment`', 
            value: '> **Follow payment instructions**\n> A staff member will provide payment details. Complete the payment as instructed.'
          },
          { 
            name: '`Step 4️⃣ - Receive Key`', 
            value: '> **Wait for key generation**\n> After payment verification, a staff member will generate your key using `/generatekey`.'
          },
          { 
            name: '`Step 5️⃣ - Order Completion`', 
            value: '> **Order finalization**\n> The staff will use `/orderid` to complete your order with all details.'
          },
          { 
            name: '`Final Step`', 
            value: '> **Enjoy your purchase!**\n> You\'ll automatically receive the Alting Customer role and your key will be sent to your DMs if they\'re open.'
          }
        )
        .setColor(0x9B59B6)
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setFooter({ text: 'ERLC Alting Support' });

      await interaction.editReply({ embeds: [supportEmbed] });

    } catch (error) {
      console.error('Error with support command:', error);
      await interaction.editReply('❌ There was an error displaying support information!');
    }
  }
};
