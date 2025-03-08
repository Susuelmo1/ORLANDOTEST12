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
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Join voice channel and stay there
  try {
    const voiceChannelId = '1347687786039214122';
    const { joinVoiceChannel, createAudioPlayer, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');

    // Join the voice channel
    const channel = client.channels.cache.get(voiceChannelId);
    if (channel) {
      const connection = joinVoiceChannel({
        channelId: voiceChannelId,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: true
      });

      // Handle reconnection if disconnected
      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          // Try to reconnect immediately
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch (error) {
          // If we can't reconnect in time, destroy and create a new connection
          connection.destroy();
          const newConnection = joinVoiceChannel({
            channelId: voiceChannelId,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true
          });
        }
      });

      console.log(`Successfully joined voice channel: ${channel.name}`);
    } else {
      console.error(`Voice channel with ID ${voiceChannelId} not found`);
    }
  } catch (error) {
    console.error('Error joining voice channel:', error);
  }

  registerCommands();
});

// Event listener for when a new member joins
client.on('guildMemberAdd', async (member) => {
  try {
    if (global.config?.welcome?.enabled) {
      const welcomeChannelId = global.config.welcome.channelId || '1337553581250838639';
      const rulesChannelId = global.config.welcome.rulesChannelId || '1337591756161683466';

      const welcomeChannel = await member.guild.channels.fetch(welcomeChannelId).catch(() => null);

      if (welcomeChannel) {
        // Send plain text welcome message
        await welcomeChannel.send(`Welcome ${member} to .gg/alterlc! 👋 Please check out <#${rulesChannelId}> and <#${global.config.welcome.termsChannelId || '1337495477050146938'}> to begin your journey.`);

        // Send a DM to the new member with more information
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle(`Welcome to ${member.guild.name}!`)
            .setDescription(`Hey ${member.user.username}, thanks for joining our server!`)
            .addFields(
              { name: '📋 Rules & Information', value: `Please make sure to read our rules in <#${rulesChannelId}>.` },
              { name: '🎟️ Support', value: 'If you need any assistance, feel free to open a ticket in our support channel.' },
              { name: '🛒 Services', value: 'Check out our services by opening a ticket in the order category.' }
            )
            .setColor(0x9B59B6)
            .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
            .setTimestamp();

          await member.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.error(`Could not send welcome DM to ${member.user.tag}:`, dmError);
          // Don't throw error for DM failures
        }

        // Log to webhook
        try {
          const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
          const { WebhookClient } = require('discord.js');
          const webhook = new WebhookClient({ url: webhookUrl });

          const logEmbed = new EmbedBuilder()
            .setTitle('New Member Joined')
            .setDescription(`${member.user.tag} has joined the server!`)
            .addFields(
              { name: 'User', value: `<@${member.user.id}>`, inline: true },
              { name: 'User ID', value: member.user.id, inline: true },
              { name: 'Account Created', value: `<t:${Math.floor(member.user.createdAt.getTime() / 1000)}:R>`, inline: true }
            )
            .setColor(0x9B59B6)
            .setTimestamp();

          await webhook.send({ embeds: [logEmbed] });
        } catch (webhookError) {
          console.error('Error sending webhook:', webhookError);
        }
      }
    }
  } catch (error) {
    console.error('Error with welcome message:', error);
  }
});

// Register slash commands
async function registerCommands() {
  try {
    const commands = [];
    const commandNames = new Set(); // Initialize a Set to store unique command names
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

    console.log('Loading command files...');

    // Load each command and check for duplicate names
    for (const file of commandFiles) {
      try {
        console.log(`Processing file: ${file}`);
        const command = require(`./commands/${file}`);

        if (command && command.data) {
          if (commandNames.has(command.data.name)) {
            console.error(`DUPLICATE DETECTED: Command name '${command.data.name}' in file ${file} is already registered.`);
          } else {
            commandNames.add(command.data.name); // Add the name to the Set
            commands.push(command.data.toJSON());
            console.log(`Added command: ${command.data.name} from file ${file}`);
          }
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

    console.log(`Started refreshing application (/) commands. Found ${commands.length} unique commands.`);

    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

// Global configurations
if (!global.config) {
  global.config = {
    welcome: {
      enabled: true,
      channelId: '1337553581250838639',
      rulesChannelId: '1337591756161683466',
      termsChannelId: '1337495477050146938'
    }
  };
}

// Track active tickets globally
if (!global.activeTickets) {
  global.activeTickets = new Map();
}

// Initialize user order history
if (!global.userOrderHistory) {
  global.userOrderHistory = new Map();
}

// Initialize vouches
if (!global.vouches) {
  global.vouches = [];
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
      case 'boost':
        ticketName = `boost-${user.username.toLowerCase()}`;
        categoryName = 'Boost Tickets';
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

    // Add owner permission for boost tickets
    if (ticketType === 'boost') {
      permissionOverwrites.push({
        id: '523693281541095424', // Owner ID
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels
        ]
      });
    }

    // Add server manager permission for support tickets
    if (ticketType === 'support') {
      permissionOverwrites.push({
        id: '1336746451761631354', // Server Manager role ID
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels
        ]
      });
    }

    // Create the ticket channel
    const ticketChannel = await guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: permissionOverwrites
    });

    // Create buttons row with close and claim buttons side by side
    const ticketButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId('claim_ticket')
          .setLabel('Claim Ticket')
          .setStyle(ButtonStyle.Success)
          .setEmoji('👤')
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
          },
          {
            name: '**`Step 1️⃣ – Payment`**',
            value: '> **Payment Methods**\n> Please wait for a staff member to provide payment instructions.\n> **TYPE `/PAYMENT` FOR PAYMENT LINKS**'
          }
        )
        .setColor(0x9B59B6)
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setFooter({ text: 'ERLC Alting Support' });
    }

    // Ping the user and staff role at the top of the ticket
    // This will be sent first before the welcome messages
    await ticketChannel.send(`${user} <@&${staffRoleId}>`);

    // Send the welcome message and buttons to the ticket channel without pinging the user
    await ticketChannel.send({ embeds: [welcomeEmbed], components: [ticketButtons] });

    // Add VIP button to the ticket panel
    if (ticketType === 'vip') {
      // Add VIP button to the ticket panel
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

      // Create VIP packages embed
      const vipEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **VIP PACKAGES**')
        .setDescription('***Please select a VIP package or use one of the links below:***')
        .addFields(
          { 
            name: '**__VIP Packages__**', 
            value: '> **Lifetime:** [Copy Me](https://www.roblox.com/catalog/98202400395342)\n> **Month:** [Copy Me](https://www.roblox.com/catalog/85144990668024)\n> **Week:** [Copy Me](https://www.roblox.com/catalog/87544796577389)'
          }
        )
        .setColor(0x9B59B6)
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png');

      await ticketChannel.send({ 
        embeds: [vipEmbed],
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
    } else if (ticketType === 'boost') {
      const boostButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('product_boost_1month')
            .setLabel('1 Month (30 Boosts)')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('product_boost_3month')
            .setLabel('3 Months (90 Boosts)')
            .setStyle(ButtonStyle.Secondary)
        );

      const boostEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **DISCORD BOOST**')
        .setDescription('Select a boost package below:')
        .addFields(
          { name: '1 Month (30 Boosts)', value: '$19.99 USD', inline: true },
          { name: '3 Months (90 Boosts)', value: '$26.99 USD', inline: true },
          { name: 'Payment', value: 'PayPal: https://paypal.me/d1chelsa (Send as Friends & Family)' }
        )
        .setColor(0x9B59B6)
        .setTimestamp();

      await ticketChannel.send({ embeds: [boostEmbed], components: [boostButtons] });

    }

    // We no longer need a separate claim button since it's now next to the close button

    // Log to webhook if configured
    try {
      const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
      const { WebhookClient } = require('discord.js');
      const webhook = new WebhookClient({ url: webhookUrl });

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
    // Handle select menu interactions
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_type_select') {
      await interaction.deferReply({ ephemeral: true });

      try {
        // Get ticket type from selected value
        const ticketType = interaction.values[0].replace('create_ticket_', '');
        const guild = interaction.guild;
        const user = interaction.user;

        // Handle ticket creation based on type
        if (ticketType === 'support') {
          // Create support ticket directly
          await createTicketChannel(interaction, guild, user, ticketType);
        } else {
          // Send instructions in DM for order, VIP, and boost tickets
          try {
            // Create appropriate embed based on ticket type
            let dmEmbed;

            if (ticketType === 'boost') {
              dmEmbed = new EmbedBuilder()
                .setTitle(`<:purplearrow:1337594384631332885> **DISCORD BOOST ORDER PROCESS**`)
                .setDescription(`***Hello ${user}!***\n\n**Before creating your ticket, please follow these important steps:**`)
                .addFields(
                  { 
                    name: '**🚨 Important Notice**', 
                    value: '```\n✅ Please read all the information below carefully.\n❌ All payments must be sent as Friends & Family.```'
                  },
                  { 
                    name: '**`Step 1️⃣ – Boost Package Options`**', 
                    value: '> **Choose from our premium boost packages:**\n> • **14x Boosts (1 Month):** $19.99 USD\n> • **14x Boosts (3 Months):** $26.99 USD'
                  },
                  { 
                    name: '**`Step 2️⃣ – Payment Information`**', 
                    value: '> **PayPal:** [Click Here](https://paypal.me/d1chelsa)\n> **Important:** Send payment as Friends & Family\n> **Note:** Include your Discord username in payment notes'
                  },
                  { 
                    name: '**`Step 3️⃣ – Order Proof Submission`**', 
                    value: '> **After payment, use the `/orderproofboost` command in your ticket with:**\n> • Select your boost package\n> • Upload screenshot of payment confirmation'
                  },
                  { 
                    name: '**`Step 4️⃣ – Boost Delivery`**', 
                    value: '> • Boosts will be applied within 1 hour\n> • 30 days warranty included\n> • Server will maintain Level 3 status'
                  }
                )
                .setColor(0x9B59B6)
                .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
                .setFooter({ text: 'ERLC Alting Support | Read carefully before proceeding' });
            } else {
              // Default embed for order and VIP tickets
              dmEmbed = new EmbedBuilder()
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
                    value: '> • Your key will match your purchase duration\\n✅ You CANNOT open a ticket until you complete these required steps.\n❌ Falsifying order proof will result in an automatic ban.