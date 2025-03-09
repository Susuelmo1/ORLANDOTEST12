
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Create a verification panel for users')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel where the verification message will be sent')
        .setRequired(true)),
  
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const channel = interaction.options.getChannel('channel');
    
    // Create the verification embed
    const verifyEmbed = new EmbedBuilder()
      .setTitle('<:purplearrow:1337594384631332885> **ACCOUNT VERIFICATION REQUIRED**')
      .setDescription('**Your account must be verified to access our services**')
      .addFields(
        { 
          name: '**Why Verify?**', 
          value: '> • Secures your membership in case of Discord outages\n> • Ensures your access to purchased services\n> • Protects against account loss and order cancellations' 
        },
        { 
          name: '**Verification Process**', 
          value: '> • Click the "Verify Now" button below\n> • You\'ll be redirected to RestoreCord\'s secure verification page\n> • No sensitive information like passwords will be requested\n> • After verification, you\'ll receive the verified role automatically'
        },
        { 
          name: '**<:PurpleLine:1336946927282950165> Security Warning**', 
          value: '```\n⚠️ Only use the official verification link below\n⚠️ We will NEVER ask for your password or credentials\n⚠️ Report suspicious links to staff immediately```'
        },
        { 
          name: '**Important Notice**', 
          value: '`If you do not verify, your order will be canceled, and you\'ll need to pay again to proceed with the alt process.`'
        }
      )
      .setColor(0x9B59B6)
      .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
      .setFooter({ text: 'ALTING ERLC™ Official Verification System' });
    
    // Create the verification button
    const verifyButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('VERIFY NOW')
          .setURL('https://restorecord.com/verify/%F0%9D%90%80%F0%9D%90%8B%F0%9D%90%93%F0%9D%90%88%F0%9D%90%8D%F0%9D%90%86%20%F0%9D%90%84%F0%9D%90%91%F0%9D%90%8B%F0%9D%90%82%E2%84%A2')
          .setStyle(ButtonStyle.Link)
          .setEmoji('<:alting:1336938112261029978>')
      );
    
    // Send the verification message to the specified channel
    await channel.send({ 
      content: '# <:alting:1336938112261029978> **[OFFICIAL VERIFICATION SYSTEM]** <:alting:1336938112261029978>\n<:PurpleLine:1336946927282950165><:PurpleLine:1336946927282950165><:PurpleLine:1336946927282950165><:PurpleLine:1336946927282950165><:PurpleLine:1336946927282950165><:PurpleLine:1336946927282950165><:PurpleLine:1336946927282950165><:PurpleLine:1336946927282950165>',
      embeds: [verifyEmbed], 
      components: [verifyButton] 
    });
    
    await interaction.editReply({ content: `✅ Verification panel created successfully in ${channel}!`, ephemeral: true });
  },
};
