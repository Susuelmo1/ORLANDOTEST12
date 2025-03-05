
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffguide')
    .setDescription('View the staff guide for using the bot'),

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

      // Create a multi-page staff guide
      const guidePages = [
        // Page 1: Introduction
        new EmbedBuilder()
          .setTitle('**@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫**\n<:purplearrow:1337594384631332885> **STAFF GUIDE**')
          .setDescription('***Welcome to the Server Alter Staff Guide! This comprehensive guide will help you understand all the commands and processes.***')
          .addFields(
            { name: '**__IMPORTANT NOTE__**', value: '**Make sure to follow all procedures exactly to ensure the best customer experience.**' },
            { name: '**Using This Guide**', value: 'Use the navigation buttons to move between pages of this guide. This first page covers the basics, while subsequent pages detail specific workflows.' }
          )
          .setColor(0x9B59B6)
          .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
          .setFooter({ text: 'Page 1/5 - Staff Guide' }),

        // Page 2: Ticket Management
        new EmbedBuilder()
          .setTitle('**@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫**\n<:purplearrow:1337594384631332885> **TICKET MANAGEMENT**')
          .setDescription('***How to properly handle customer tickets***')
          .addFields(
            { name: '**__CLAIMING TICKETS__**', value: '> When a new ticket is created, click the "**Claim Ticket**" button to assign yourself as the handler.' },
            { name: '**__TICKET WORKFLOW__**', value: '```\n1. Customer creates ticket\n2. You claim the ticket\n3. Customer submits /orderproof\n4. You verify proof and use /generatekey\n5. You activate service with /orderstart\n6. After service completes, use /orderend```' },
            { name: '**__TICKET TYPES__**', value: '> **Order Tickets**: For regular account services\n> **Support Tickets**: For general assistance\n> **VIP Tickets**: For VIP customer services' }
          )
          .setColor(0x9B59B6)
          .setFooter({ text: 'Page 2/5 - Staff Guide' }),

        // Page 3: Key Management
        new EmbedBuilder()
          .setTitle('**@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫**\n<:purplearrow:1337594384631332885> **KEY GENERATION**')
          .setDescription('***How to properly generate and manage customer keys***')
          .addFields(
            { name: '**__/generatekey COMMAND__**', value: '```\n/generatekey user:@Username package:15_bots duration:7 queue:5 waittime:20```' },
            { name: '**__PARAMETERS EXPLAINED__**', value: '> **user**: The Discord user receiving the key\n> **package**: The service package they purchased\n> **duration**: Length of service in days\n> **queue**: Their position in queue (optional)\n> **waittime**: Estimated wait time in minutes (optional)' },
            { name: '**__KEY SECURITY__**', value: '**IMPORTANT:** Keys are sensitive! Never share keys publicly. They should only be visible to staff and the purchasing customer.' }
          )
          .setColor(0x9B59B6)
          .setFooter({ text: 'Page 3/5 - Staff Guide' }),

        // Page 4: Order Management
        new EmbedBuilder()
          .setTitle('**@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫**\n<:purplearrow:1337594384631332885> **ORDER MANAGEMENT**')
          .setDescription('***How to start and end customer orders***')
          .addFields(
            { name: '**__/orderstart COMMAND__**', value: '```\n/orderstart user:@Username accounts:15 key:F778D3D5A548DF3CE7BB9938665367C6 server_code:ABCDEF```' },
            { name: '**__PARAMETERS EXPLAINED__**', value: '> **user**: The Discord user to activate service for\n> **accounts**: Number of Roblox accounts to join server\n> **key**: The generated key for this order\n> **server_code**: The ERLC private server code' },
            { name: '**__ORDER VERIFICATION__**', value: 'After starting an order, the Roblox accounts will join the ERLC server. The customer can verify this with `/verifyorder orderid:ORDER-ID`.' },
            { name: '**__/orderend COMMAND__**', value: '```\n/orderend orderid:ORDER-12345 users:@Username,@Username2 duration:120```' },
            { name: '**__ENDING ORDERS__**', value: 'When ending orders, include all users who received service and the total duration in minutes. This helps with tracking and customer history.' }
          )
          .setColor(0x9B59B6)
          .setFooter({ text: 'Page 4/5 - Staff Guide' }),

        // Page 5: Moderation & Troubleshooting
        new EmbedBuilder()
          .setTitle('**@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫**\n<:purplearrow:1337594384631332885> **MODERATION & TROUBLESHOOTING**')
          .setDescription('***How to handle difficult situations and common problems***')
          .addFields(
            { name: '**__PROBLEM CUSTOMERS__**', value: 'For disruptive customers, use `/softban @Username` which removes their messages but allows them to rejoin when calm.' },
            { name: '**__CANCELLING ORDERS__**', value: 'If an order needs to be cancelled, use `/ordercancel key:KEY_HERE` or `/ordercancel orderid:ORDER-ID`.' },
            { name: '**__COMMON ISSUES__**', value: '```\n1. Role Assignment Failed: Check bot permissions\n2. Account Not Joining: Verify server code is correct\n3. Key Already Used: Contact admin to reset key\n4. Long Queue Times: Manage customer expectations```' },
            { name: '**__SHIFT TRACKING__**', value: 'Start your shift with `/shiftstart` and end it with `/shiftend`. This helps track staff activity and service quality.' }
          )
          .setColor(0x9B59B6)
          .setFooter({ text: 'Page 5/5 - Staff Guide' })
      ];

      // Create navigation buttons
      const buttons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⬅️'),
          new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('➡️')
        );

      // Send the first page
      const message = await interaction.editReply({
        embeds: [guidePages[0]],
        components: [buttons]
      });

      // Create collector for button interactions
      const collector = message.createMessageComponentCollector({ 
        time: 600000 // 10 minutes
      });

      // Track current page
      let currentPage = 0;

      // Handle button clicks
      collector.on('collect', async i => {
        // Make sure only the command user can navigate
        if (i.user.id !== interaction.user.id) {
          return i.reply({ 
            content: '❌ This guide is not for you! Use /staffguide to get your own guide.', 
            ephemeral: true 
          });
        }

        await i.deferUpdate();

        if (i.customId === 'next_page') {
          currentPage = (currentPage + 1) % guidePages.length;
        } else if (i.customId === 'prev_page') {
          currentPage = (currentPage - 1 + guidePages.length) % guidePages.length;
        }

        await i.editReply({
          embeds: [guidePages[currentPage]],
          components: [buttons]
        });
      });

      // End collector when time expires
      collector.on('end', () => {
        interaction.editReply({
          embeds: [guidePages[currentPage]],
          components: [] // Remove buttons when time expires
        }).catch(console.error);
      });

    } catch (error) {
      console.error('Error displaying staff guide:', error);
      await interaction.editReply('❌ There was an error displaying the staff guide! Please try again later.');
    }
  }
};
