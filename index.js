require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Initialize a new Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

// Create a collection to store commands
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// Load commands from the 'commands' directory
for (const file of commandFiles) {
  try {
    const command = require(`./commands/${file}`);
    // Check if the command has the required structure
    if (command && command.data && command.data.name) {
      client.commands.set(command.data.name, command);
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.error(`Command file ${file} is missing required structure or 'data.name' property`);
    }
  } catch (error) {
    console.error(`Error loading command from file ${file}:`, error);
  }
}

// Key storage (Replace this with a real database for production)
const orderProofKeys = new Map();

// Initialize client.orderProofs map for tracking orders
if (!client.orderProofs) {
  client.orderProofs = new Map();
}

// Event listener for when the bot is ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  registerCommands();
});

// Register slash commands
async function registerCommands() {
  try {
    // Create an array to store command data
    const commands = [];
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

    // Load each command and add its data to the array
    for (const file of commandFiles) {
      try {
        const command = require(`./commands/${file}`);
        if (command && command.data) {
          commands.push(command.data.toJSON());
        } else {
          console.error(`Command file ${file} is missing 'data' property.`);
        }
      } catch (cmdError) {
        console.error(`Error loading command from file ${file}:`, cmdError);
      }
    }

    // Use the REST API to register the commands
    const { REST } = require('@discordjs/rest');
    const { Routes } = require('discord-api-types/v9');

    const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

// Track active tickets globally
if (!global.activeTickets) {
  global.activeTickets = new Map();
}

// Function to create a ticket channel
async function createTicketChannel(interaction, guild, user, ticketType, fromDM = false) {
  try {
    // Check for existing tickets
    const existingTickets = guild.channels.cache.filter(
      channel => 
        channel.type === ChannelType.GuildText && 
        channel.name.includes(user.username.toLowerCase()) && 
        channel.name.includes('ticket')
    );

    // Limit tickets to 10 per user
    if (existingTickets.size >= 10) {
      return interaction.editReply('❌ You already have the maximum number of tickets open (10). Please close some before opening more.');
    }

    // Count total open tickets by type
    const openTickets = guild.channels.cache.filter(
      channel => 
        channel.type === ChannelType.GuildText && 
        channel.name.includes(ticketType)
    );

    // Calculate queue position (number of tickets ahead + 1)
    const queuePosition = openTickets.size + 1;

    // Define ticket name and category
    let ticketName = '';
    let categoryName = '';

    switch (ticketType) {
      case 'order':
        ticketName = `order-${user.username.toLowerCase()}`;
        categoryName = 'Order Tickets';
        break;
      case 'support':
        ticketName = `support-${user.username.toLowerCase()}`;
        categoryName = 'Support Tickets';
        break;
      case 'vip':
        ticketName = `vip-${user.username.toLowerCase()}`;
        categoryName = 'VIP Tickets';
        break;
      default:
        ticketName = `ticket-${user.username.toLowerCase()}`;
        categoryName = 'Tickets';
    }

    // Find or create the ticket category
    let category = guild.channels.cache.find(
      channel => channel.type === ChannelType.GuildCategory && channel.name === categoryName
    );

    if (!category) {
      category = await guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory
      });
    }

    // Set permissions for the ticket channel
    const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164'; // Server Alter role ID
    const permissionOverwrites = [
      {
        id: guild.id, // @everyone role
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: user.id, // Ticket creator
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.SendMessages
        ]
      },
      {
        id: staffRoleId, // Staff role
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels
        ]
      }
    ];

    // Create the ticket channel
    const ticketChannel = await guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: permissionOverwrites
    });

    // Create a button to close the ticket
    const closeButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒')
      );

    // Send welcome message to the ticket channel
    let welcomeEmbed;

    if (ticketType === 'support') {
      // Simple welcome message for general support
      welcomeEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **SUPPORT TICKET**')
        .setDescription(`***Hello ${user}, a staff member will be with you shortly.***\n\n**Queue Position: #${queuePosition}**`)
        .setColor(0x9B59B6)
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setFooter({ text: 'ERLC Alting Support' });
    } else {
      // Enhanced welcome message for order and VIP tickets
      welcomeEmbed = new EmbedBuilder()
        .setTitle(`<:purplearrow:1337594384631332885> **${ticketType.toUpperCase()} TICKET**`)
        .setDescription(`***Hello ${user}, welcome to your ${ticketType === 'order' ? 'Order' : 'VIP'} Ticket!***\n\n**Queue Position: #${queuePosition}**`)
        .addFields(
          {
            name: '**🚨 Important Notice**',
            value: '```\n✅ You must complete the required steps below.\n❌ Falsifying order proof will result in an automatic ban.```'
          },
          { 
            name: '**`Step 1️⃣ – Order Proof Submission`**', 
            value: '> **Use `/orderproof` to start your order process**\n> You must provide your Roblox username and proof of purchase.'
          },
          { 
            name: '**`Step 2️⃣ – Key Generation`**', 
            value: '> **After verification, staff will generate your key**\n> Your key will match your purchase duration and is strictly confidential.'
          },
          { 
            name: '**`Step 3️⃣ – Order Completion`**', 
            value: '> **Staff will finalize your order using `/orderstart`**\n> The order details will include your Roblox username, purchase details, and Order ID.\n> Once completed, you will receive the Alting Customer role!'
          },
          {
            name: '**<:PurpleLine:1336946927282950165> Security Warning**',
            value: '> __***Your key is personal and must not be shared under any circumstances.***__'
          }
        )
        .setColor(0x9B59B6)
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setFooter({ text: 'ERLC Alting Support' });
    }

    // Send the welcome message and close button to the ticket channel
    await ticketChannel.send({ embeds: [welcomeEmbed], components: [closeButton] });

    // Add VIP button to the ticket panel
    if (ticketType === 'vip') {
      const vipButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('product_week_vip')
            .setLabel('Weekly VIP')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('product_month_vip')
            .setLabel('Monthly VIP')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('product_lifetime_vip')
            .setLabel('Lifetime VIP')
            .setStyle(ButtonStyle.Secondary)
        );

      await ticketChannel.send({ 
        content: '**<:purplearrow:1337594384631332885> Please select a VIP package:**', 
        components: [vipButtons] 
      });
    } else if (ticketType === 'order') {
      // Add order buttons for different bot packages
      const orderButtons1 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('product_10_deal')
            .setLabel('10 Bots')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('product_15_deal')
            .setLabel('15 Bots')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('product_20_deal')
            .setLabel('20 Bots')
            .setStyle(ButtonStyle.Secondary)
        );
        
      const orderButtons2 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('product_25_deal')
            .setLabel('25 Bots')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('product_30_deal')
            .setLabel('30 Bots')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('product_40_deal')
            .setLabel('40 Bots')
            .setStyle(ButtonStyle.Secondary)
        );
        
      const orderButtons3 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('product_full_server')
            .setLabel('Full Server')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('product_refill')
            .setLabel('Refill')
            .setStyle(ButtonStyle.Success)
        );

      await ticketChannel.send({ 
        content: '**<:purplearrow:1337594384631332885> Please select a package:**', 
        components: [orderButtons1, orderButtons2, orderButtons3] 
      });
    }

    // Ping the user and staff role in the ticket
    await ticketChannel.send(`${user} <@&${staffRoleId}>`);

    // Track ticket creation for logging
    if (!global.ticketStats) {
      global.ticketStats = {
        total: 0,
        byType: {
          order: 0,
          support: 0,
          vip: 0
        },
        byUser: new Map()
      };
    }
    
    global.ticketStats.total++;
    global.ticketStats.byType[ticketType]++;
    
    const userStats = global.ticketStats.byUser.get(user.id) || { total: 0, types: {} };
    userStats.total++;
    userStats.types[ticketType] = (userStats.types[ticketType] || 0) + 1;
    global.ticketStats.byUser.set(user.id, userStats);

    // Log to webhook if configured
    try {
      if (process.env.LOG_WEBHOOK_URL) {
        const { WebhookClient } = require('discord.js');
        const webhook = new WebhookClient({ url: process.env.LOG_WEBHOOK_URL });
        
        const logEmbed = new EmbedBuilder()
          .setTitle('New Ticket Created')
          .setDescription(`A new ${ticketType} ticket has been created`)
          .addFields(
            { name: 'User', value: `${user.tag} (<@${user.id}>)`, inline: true },
            { name: 'Ticket Type', value: ticketType.charAt(0).toUpperCase() + ticketType.slice(1), inline: true },
            { name: 'Queue Position', value: `#${queuePosition}`, inline: true },
            { name: 'Channel', value: `<#${ticketChannel.id}>`, inline: false }
          )
          .setColor(0x9B59B6)
          .setTimestamp();
          
        await webhook.send({ embeds: [logEmbed] });
      }
    } catch (webhookError) {
      console.error('Error sending webhook:', webhookError);
    }

    // Handle DM context
    if (fromDM) {
      // Update the DM with ticket information
      const ticketInfoEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **TICKET CREATED**')
        .setDescription(`***Your ${ticketType} ticket has been created in the server.***\n\n[**Click here to view your ticket**](https://discord.com/channels/${guild.id}/${ticketChannel.id})`)
        .addFields(
          {
            name: '**Required Next Step:**',
            value: '```\nUse /orderproof in your ticket channel with:\n1. Your Roblox username\n2. Proof of purchase (screenshot)```'
          },
          {
            name: '**Security Warning:**',
            value: '```\n⚠️ Falsifying proof will result in an automatic ban.\n⚠️ Your key is personal and must not be shared.```'
          }
        )
        .setColor(0x9B59B6)
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setFooter({ text: 'ERLC Alting Support' });

      await interaction.editReply({ 
        content: `✅ Ticket created successfully!`,
        embeds: [ticketInfoEmbed],
        components: []
      });
    } else {
      // Reply in the server
      await interaction.editReply(`✅ Your ticket has been created: ${ticketChannel}`);
    }
    
    // Store the ticket in global active tickets map
    global.activeTickets.set(ticketChannel.id, {
      userId: user.id,
      type: ticketType,
      createdAt: new Date(),
      queuePosition: queuePosition
    });
    
  } catch (error) {
    console.error('Error creating ticket channel:', error);
    await interaction.editReply('❌ There was an error creating your ticket. Please try again later.');
  }
}

// Handle interactions
client.on('interactionCreate', async interaction => {
  try {
    // Handle slash commands
    if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) return;

      // Check permissions for specific commands
      if (['ban', 'kick', 'dmall', 'ticketmaker'].includes(interaction.commandName)) {
        const ownersIds = ['523693281541095424', '1011347151021953145']; // Owner IDs
        const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164'; // Server Alter role ID

        // Owner-only commands
        if (['ban', 'kick', 'dmall'].includes(interaction.commandName)) {
          if (!ownersIds.includes(interaction.user.id)) {
            return interaction.reply({ content: '❌ You do not have permission to use this command!', ephemeral: true });
          }
        }

        // Staff-only commands
        if (['ticketmaker', 'generatekey', 'softban', 'orderid', 'orderstart'].includes(interaction.commandName)) {
          const member = interaction.member;
          const hasStaffRole = member.roles.cache.has(staffRoleId);
          const isOwner = ownersIds.includes(interaction.user.id);

          if (!hasStaffRole && !isOwner) {
            return interaction.reply({ content: '❌ Only staff members can use this command!', ephemeral: true });
          }
        }
      }

      try {
        // Execute the command
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true }).catch(console.error);
      }
    }

    // Handle button interactions
    else if (interaction.isButton()) {
      // Ticket creation buttons
      if (interaction.customId.startsWith('create_ticket_')) {
        await interaction.deferReply({ ephemeral: true });

        try {
          // Get ticket type from button ID
          const ticketType = interaction.customId.replace('create_ticket_', '');
          const guild = interaction.guild;
          const user = interaction.user;

          // Handle ticket creation based on type
          if (ticketType === 'support') {
            // Create support ticket directly
            await createTicketChannel(interaction, guild, user, ticketType);
          } else {
            // Send instructions in DM for order and VIP tickets
            try {
              const orderStartEmbed = new EmbedBuilder()
                .setTitle(`<:purplearrow:1337594384631332885> **${ticketType.toUpperCase()} ORDER PROCESS**`)
                .setDescription(`***Hello ${user}!***\n\n**Before creating your ticket, please follow these important steps:**`)
                .addFields(
                  { 
                    name: '**🚨 Important Notice**', 
                    value: '```\n✅ You CANNOT open a ticket until you complete these required steps.\n❌ Falsifying order proof will result in an automatic ban.```'
                  },
                  { 
                    name: '**`Step 1️⃣ – Make Your Purchase`**', 
                    value: '> **Purchase your desired package from one of these links:**'
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
                  },
                  { 
                    name: '**`Step 2️⃣ – Order Proof Submission`**', 
                    value: '> **After purchase, use the `/orderproof` command in your ticket with:**\n> • Your Roblox username\n> • Screenshot of your purchase'
                  },
                  { 
                    name: '**`Step 3️⃣ – Key Generation`**', 
                    value: '> • Your key will match your purchase duration\n> • The key is strictly confidential\n> • __***Must NOT be shared under any circumstances***__'
                  }
                )
                .setColor(0x9B59B6)
                .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
                .setFooter({ text: 'ERLC Alting Support | Read carefully before proceeding' });

              const confirmButton = new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder()
                    .setCustomId(`confirm_create_${ticketType}`)
                    .setLabel('I Understand & Create Ticket')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
                );

              await user.send({ 
                embeds: [orderStartEmbed],
                components: [confirmButton]
              });

              await interaction.editReply(`✅ Check your DMs for important information before creating your ${ticketType} ticket!`);

            } catch (error) {
              console.error('Could not send DM to user:', error);
              await interaction.editReply("❌ I couldn't send you a DM with instructions. Please make sure your DMs are open and try again.");
            }
          }

        } catch (error) {
          console.error('Error initiating ticket process:', error);
          await interaction.editReply('❌ There was an error starting your ticket process! Please try again later.');
        }
      }

      // Handle ticket confirmation from DM
      else if (interaction.customId.startsWith('confirm_create_')) {
        await interaction.deferReply();

        try {
          // Get ticket type from button ID
          const ticketType = interaction.customId.replace('confirm_create_', '');
          const user = interaction.user;

          // Find the guild where the user is a member
          const guilds = client.guilds.cache;
          let targetGuild = null;

          for (const [guildId, guild] of guilds) {
            try {
              const member = await guild.members.fetch(user.id);
              if (member) {
                targetGuild = guild;
                break;
              }
            } catch (e) {
              // User not in this guild, continue checking
              continue;
            }
          }

          if (!targetGuild) {
            return interaction.editReply('❌ I could not find the server. Please try again from the server.');
          }

          // Create the ticket in the found guild
          await createTicketChannel(interaction, targetGuild, user, ticketType, true);

        } catch (error) {
          console.error('Error creating ticket from DM confirmation:', error);
          await interaction.editReply('❌ There was an error creating your ticket! Please try again from the server.');
        }
      }

      // Close ticket button
      else if (interaction.customId === 'close_ticket') {
        await interaction.deferReply({ ephemeral: true });

        try {
          const channel = interaction.channel;

          // Confirmation message
          const confirmEmbed = new EmbedBuilder()
            .setTitle('Close Ticket')
            .setDescription('Are you sure you want to close this ticket? This action cannot be undone.')
            .setColor(0x9B59B6);

          const confirmButtons = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('confirm_close')
                .setLabel('Close')
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId('cancel_close')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
            );

          await interaction.editReply({ embeds: [confirmEmbed], components: [confirmButtons] });

        } catch (error) {
          console.error('Error closing ticket:', error);
          await interaction.editReply('❌ There was an error closing this ticket!');
        }
      }

      // Confirm close ticket
      else if (interaction.customId === 'confirm_close') {
        await interaction.deferReply({ ephemeral: true });

        try {
          const channel = interaction.channel;
          const ticketType = channel.name.includes('order') ? 'order' : 
                            channel.name.includes('support') ? 'support' : 
                            channel.name.includes('vip') ? 'vip' : 'ticket';
                            
          // Get ticket creator information from global map
          let ticketCreator = 'Unknown User';
          let ticketCreatorId = null;
          let ticketData = null;
          
          if (global.activeTickets && global.activeTickets.has(channel.id)) {
            ticketData = global.activeTickets.get(channel.id);
            ticketCreatorId = ticketData.userId;
            
            try {
              const user = await client.users.fetch(ticketCreatorId);
              ticketCreator = user;
            } catch (userError) {
              console.error('Error fetching ticket creator:', userError);
            }
          }
          
          // Create a transcript embed
          const closingEmbed = new EmbedBuilder()
            .setTitle('<:purplearrow:1337594384631332885> **TICKET CLOSED**')
            .setDescription('***This ticket is now closed and will be deleted in 5 seconds...***')
            .addFields(
              { name: '**Closed By**', value: `${interaction.user}`, inline: true },
              { name: '**Ticket Type**', value: `\`${ticketType.charAt(0).toUpperCase() + ticketType.slice(1)}\``, inline: true }
            )
            .setColor(0x9B59B6)
            .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
            .setFooter({ text: 'ERLC Alting Support' })
            .setTimestamp();

          await channel.send({ embeds: [closingEmbed] });

          // Log ticket closure to webhook
          try {
            if (process.env.LOG_WEBHOOK_URL) {
              const { WebhookClient } = require('discord.js');
              const webhook = new WebhookClient({ url: process.env.LOG_WEBHOOK_URL });
              
              // Collect up to 100 messages for the log
              const messages = await channel.messages.fetch({ limit: 100 });
              const messageLog = Array.from(messages.values())
                .reverse()
                .map(msg => {
                  const time = new Date(msg.createdTimestamp).toLocaleString();
                  const user = msg.author.tag;
                  const content = msg.content || '[No text content]';
                  const attachments = msg.attachments.size > 0 
                    ? `\nAttachments: ${msg.attachments.map(a => a.url).join(', ')}` 
                    : '';
                  const embeds = msg.embeds.length > 0 ? '\n[Embed was sent]' : '';
                  
                  return `[${time}] ${user}: ${content}${attachments}${embeds}`;
                })
                .join('\n\n');
                
              // Create a summary embed with ticket information
              const logEmbed = new EmbedBuilder()
                .setTitle('Ticket Closed')
                .setDescription(`A ${ticketType} ticket has been closed`)
                .addFields(
                  { name: 'Ticket Creator', value: ticketCreatorId ? `<@${ticketCreatorId}>` : 'Unknown', inline: true },
                  { name: 'Closed By', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                  { name: 'Ticket Type', value: ticketType.charAt(0).toUpperCase() + ticketType.slice(1), inline: true },
                  { name: 'Channel Name', value: channel.name, inline: true },
                  { name: 'Duration', value: ticketData?.createdAt ? 
                      `${Math.round((new Date() - new Date(ticketData.createdAt)) / (1000 * 60))} minutes` : 
                      'Unknown', inline: true }
                )
                .setColor(0x9B59B6)
                .setTimestamp();
              
              // If the log is too long for Discord's limits, split or truncate
              if (messageLog.length > 3900) {
                await webhook.send({ 
                  embeds: [logEmbed],
                  content: 'Ticket transcript (beginning):',
                  files: [{
                    attachment: Buffer.from(messageLog),
                    name: `transcript-${channel.name}-${new Date().toISOString()}.txt`
                  }]
                });
              } else {
                logEmbed.addFields({ 
                  name: 'Transcript', 
                  value: '```' + messageLog.substring(0, 1000) + (messageLog.length > 1000 ? '...' : '') + '```'
                });
                
                await webhook.send({ embeds: [logEmbed] });
              }
            }
          } catch (webhookError) {
            console.error('Error sending webhook log:', webhookError);
          }

          // Delete the channel after 5 seconds
          setTimeout(async () => {
            try {
              // Remove from active tickets map
              if (global.activeTickets) {
                global.activeTickets.delete(channel.id);
              }
              
              await channel.delete();

              // Update queue positions after a ticket is closed
              const guild = interaction.guild;
              const openTickets = guild.channels.cache.filter(
                ch => ch.type === ChannelType.GuildText && ch.name.includes(ticketType)
              );

              // Notify each remaining ticket about updated queue position
              let position = 1;
              openTickets.forEach(async (ch, index) => {
                try {
                  // Update the global queue position
                  if (global.activeTickets && global.activeTickets.has(ch.id)) {
                    const ticketInfo = global.activeTickets.get(ch.id);
                    ticketInfo.queuePosition = position;
                    global.activeTickets.set(ch.id, ticketInfo);
                  }
                  
                  await ch.send({
                    embeds: [
                      new EmbedBuilder()
                        .setTitle('<:purplearrow:1337594384631332885> **QUEUE UPDATE**')
                        .setDescription(`***Your ticket queue position has been updated.***\n\n**Current Position: #${position}**`)
                        .setColor(0x9B59B6)
                        .setFooter({ text: 'ERLC Alting Support' })
                    ]
                  });
                  position++;
                } catch (err) {
                  console.error('Error updating queue position for channel:', ch.name, err);
                }
              });
            } catch (error) {
              console.error('Error deleting channel:', error);
            }
          }, 5000);

          await interaction.editReply('✅ Closing ticket...');

        } catch (error) {
          console.error('Error closing ticket:', error);
          await interaction.editReply('❌ There was an error closing this ticket!');
        }
      }

      // Cancel close ticket
      else if (interaction.customId === 'cancel_close') {
        await interaction.update({ content: '✅ Ticket closure cancelled.', embeds: [], components: [] });
      }

      // Handle product selection buttons
      else if (interaction.customId.startsWith('product_')) {
        await interaction.deferReply({ ephemeral: false });

        try {
          const productId = interaction.customId.replace('product_', '');
          let productName = '';
          let productPrice = '';

          // Map product ID to name and price
          switch (productId) {
            case 'week_vip':
              productName = 'Weekly VIP';
              productPrice = '1,498';
              break;
            case 'month_vip':
              productName = 'Monthly VIP';
              productPrice = '4,500';
              break;
            case 'lifetime_vip':
              productName = 'Lifetime VIP';
              productPrice = '6,500';
              break;
            case 'refill':
              productName = 'Refill';
              productPrice = '100';
              break;
            case 'full_server':
              productName = 'Full Server';
              productPrice = '698';
              break;
            case '15_deal':
              productName = '15 Deal';
              productPrice = '198';
              break;
            case '40_deal':
              productName = '40 Deal';
              productPrice = '898';
              break;
            case '25_deal':
              productName = '25 Deal';
              productPrice = '398';
              break;
            case '30_deal':
              productName = '30 Deal';
              productPrice = '500';
              break;
            case '20_deal':
              productName = '20 Deal';
              productPrice = '300';
              break;
            case '10_deal':
              productName = '10 Deal';
              productPrice = '148';
              break;
            case 'imagealt_25':
              productName = 'ImageAlt 25';
              productPrice = '536';
              break;
            default:
              productName = 'Unknown Product';
              productPrice = 'Unknown';
          }

          // Create a payment embed with instructions
          const paymentEmbed = new EmbedBuilder()
            .setTitle('<:purplearrow:1337594384631332885> **PAYMENT DETAILS**')
            .setDescription(`***You have selected: __${productName}__ - Price: __${productPrice}__***`)
            .addFields(
              { 
                name: '**`Step 1️⃣ – Payment`**', 
                value: '> **Payment Methods**\n> Please wait for a staff member to provide payment instructions.'
              },
              { 
                name: '**`Step 2️⃣ – Confirmation`**', 
                value: '> **Order Proof**\n> After payment, use `/orderproof` to submit your proof of purchase.'
              },
              { 
                name: '**`Step 3️⃣ – Activation`**', 
                value: '> **Key Generation**\n> Staff will generate your key and activate your service.'
              },
              {
                name: '**<:PurpleLine:1336946927282950165> Important Information**',
                value: '> • Your key will match your purchase duration\n> • The key is strictly confidential\n> • __***Must NOT be shared under any circumstances***__'
              }
            )
            .setColor(0x9B59B6)
            .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
            .setFooter({ text: 'ERLC Alting Support' });

          const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';

          await interaction.editReply({ 
            content: `<@&${staffRoleId}> New order: **${productName}** - **${productPrice}**`,
            embeds: [paymentEmbed]
          });
          
          // Log to webhook if configured
          try {
            if (process.env.LOG_WEBHOOK_URL) {
              const { WebhookClient } = require('discord.js');
              const webhook = new WebhookClient({ url: process.env.LOG_WEBHOOK_URL });
              
              const logEmbed = new EmbedBuilder()
                .setTitle('Product Selected')
                .setDescription(`A user has selected a product in a ticket`)
                .addFields(
                  { name: 'User', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                  { name: 'Product', value: productName, inline: true },
                  { name: 'Price', value: productPrice, inline: true },
                  { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: false }
                )
                .setColor(0x9B59B6)
                .setTimestamp();
                
              await webhook.send({ embeds: [logEmbed] });
            }
          } catch (webhookError) {
            console.error('Error sending webhook:', webhookError);
          }

          // Send confirmation to the user's DM
          try {
            const user = interaction.user;
            const dmEmbed = new EmbedBuilder()
              .setTitle('🛒 Product Selected')
              .setDescription(`You've selected: **${productName}** - Price: **${productPrice}**\n\nPlease return to your ticket and complete the payment process with staff assistance.`)
              .setColor(0x9B59B6)
              .setFooter({ text: 'ERLC Alting Support' });

            await user.send({ embeds: [dmEmbed] });
          } catch (error) {
            console.error('Could not send DM to user:', error);
            // No need to notify in channel as this is just a bonus feature
          }

        } catch (error) {
          console.error('Error handling product selection:', error);
          await interaction.editReply('❌ There was an error processing your product selection!');
        }
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
  }
});

// Generate a unique order ID
function generateOrderId() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Generate a unique key with optional expiration
function generateKey(expirationDays = 365) {
  const key = crypto.randomBytes(16).toString('hex').toUpperCase();
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + expirationDays);

  return {
    key,
    expirationDate,
    used: false
  };
}

// Generate a unique order proof key
function generateOrderProofKey(robloxUsername, screenshotUrl, purchasedItems, duration) {
  const key = crypto.randomBytes(16).toString('hex').toUpperCase();
  orderProofKeys.set(key, {
    robloxUsername,
    screenshotUrl,
    purchasedItems,
    duration,
  });
  return key;
}

// Handle the /orderproof command
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('/orderproof')) {
    const args = message.content.slice(11).trim().split(/ +/);
    const targetUsername = args[0].replace('<@!', '').replace('>', '');
    const targetUser = await message.guild.members.fetch(targetUsername);

    if (!targetUser) {
      return message.reply(`❌ User not found.`);
    }

    const orderProofKey = orderProofKeys.get(targetUser.id);

    if (orderProofKey) {
      const orderProofInfo = orderProofKeys.get(orderProofKey);
      const embed = new EmbedBuilder()
        .setTitle('Order Proof')
        .setDescription(`**Roblox Username:** ${orderProofInfo.robloxUsername}\n**Screenshot:** ${orderProofInfo.screenshotUrl}\n**Purchased Items:** ${orderProofInfo.purchasedItems}\n**Duration:** ${orderProofInfo.duration}`)
        .setColor(0x9B59B6)
        .setImage(orderProofInfo.screenshotUrl)
        .setFooter({ text: 'ERLC Alting Support' });

      return message.reply({ embeds: [embed] });
    } else {
      return message.reply(`❌ No order proof found for ${targetUser}.`);
    }
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);