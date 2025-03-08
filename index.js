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
    // Handle slash commands
    if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) return;

      // Check permissions for specific commands
      const ownersIds = ['523693281541095424', '1011347151021953145']; // Owner IDs
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164'; // Server Alter role ID

      // Owner-only commands
      if (['ban', 'kick', 'dmall'].includes(interaction.commandName)) {
        if (!ownersIds.includes(interaction.user.id)) {
          return interaction.reply({ content: '❌ You do not have permission to use this command!', flags: { ephemeral: true } });
        }
      }

      // Staff-only commands
      if (['ticketmaker', 'generatekey', 'softban', 'orderid', 'orderstart', 'role', 'staffhandbook', 
           'ordercancel', 'orderend', 'orderhistory', 'reactivateid', 'shiftstart', 'shiftend'].includes(interaction.commandName)) {
        const member = interaction.member;
        const hasStaffRole = member.roles.cache.has(staffRoleId);
        const isOwner = ownersIds.includes(interaction.user.id);

        if (!hasStaffRole && !isOwner) {
          return interaction.reply({ content: '❌ Only staff members can use this command!', flags: { ephemeral: true } });
        }
      }

      try {
        // Execute the command
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error executing this command!', flags: { ephemeral: true } }).catch(console.error);
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
              await interaction.editReply("❌ I couldn't send you a DM with instructions. Please makesure your DMs are open and try again.");
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
            .setDescription(`This ticket has been closed by ${interaction.user.tag}`)
            .setColor(0x9B59B6)
            .setTimestamp();

          // Log ticket closing
          await channel.send({ embeds: [closingEmbed] });

          // Add a delay before deleting the channel
          await interaction.editReply('✅ Ticket will be closed in 5 seconds.');

          // Remove from active tickets map
          if (global.activeTickets && global.activeTickets.has(channel.id)) {
            global.activeTickets.delete(channel.id);
          }

          // Delete the channel after 5 seconds
          setTimeout(async () => {
            try {
              await channel.delete();
            } catch (deleteError) {
              console.error('Error deleting channel:', deleteError);
            }
          }, 5000);

          // Log to webhook
          try {
            const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
            const { WebhookClient } = require('discord.js');
            const webhook = new WebhookClient({ url: webhookUrl });

            const logEmbed = new EmbedBuilder()
              .setTitle('Ticket Closed')
              .setDescription(`A ticket has been closed by ${interaction.user.tag}`)
              .addFields(
                { name: 'Ticket Type', value: ticketType.charAt(0).toUpperCase() + ticketType.slice(1), inline: true },
                { name: 'Channel Name', value: channel.name, inline: true },
                { name: 'Closed By', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true }
              )
              .setColor(0x9B59B6)
              .setTimestamp();

            if (ticketCreatorId) {
              logEmbed.addFields({ name: 'Created By', value: `${ticketCreator.tag || 'Unknown'} (<@${ticketCreatorId}>)`, inline: true });
            }

            await webhook.send({ embeds: [logEmbed] });
          } catch (webhookError) {
            console.error('Error sending webhook:', webhookError);
          }
        } catch (error) {
          console.error('Error closing ticket:', error);
          await interaction.editReply('❌ There was an error closing this ticket!');
        }
      }

      // Cancel close ticket
      else if (interaction.customId === 'cancel_close') {
        await interaction.update({ 
          content: '✅ Ticket close cancelled.', 
          embeds: [], 
          components: [] 
        });
      }

      // Product selection buttons
      else if (interaction.customId.startsWith('product_')) {
        await interaction.deferReply({ ephemeral: true });

        try {
          const product = interaction.customId.replace('product_', '');
          const channel = interaction.channel;

          // Store the product selection for this ticket
          if (!global.activeTickets.has(channel.id)) {
            global.activeTickets.set(channel.id, {});
          }

          const ticketData = global.activeTickets.get(channel.id);
          ticketData.selectedProduct = product;
          global.activeTickets.set(channel.id, ticketData);

          // Create product information embed based on selection
          let productInfo = '';
          let productPrice = '';

          switch (product) {
            case '10_deal':
              productInfo = '10 Bots - Weekly Access';
              productPrice = '$10.00';
              break;
            case '15_deal':
              productInfo = '15 Bots - Weekly Access';
              productPrice = '$15.00';
              break;
            case '20_deal':
              productInfo = '20 Bots - Weekly Access';
              productPrice = '$20.00';
              break;
            case '25_deal':
              productInfo = '25 Bots - Weekly Access';
              productPrice = '$25.00';
              break;
            case '30_deal':
              productInfo = '30 Bots - Weekly Access';
              productPrice = '$30.00';
              break;
            case '40_deal':
              productInfo = '40 Bots - Weekly Access';
              productPrice = '$40.00';
              break;
            case 'full_server':
              productInfo = 'Full Server - Weekly Access';
              productPrice = '$50.00';
              break;
            case 'refill':
              productInfo = 'Refill Service';
              productPrice = '$20.00';
              break;
            case 'week_vip':
              productInfo = 'VIP Access - 1 Week';
              productPrice = '$5.00';
              break;
            case 'month_vip':
              productInfo = 'VIP Access - 1 Month';
              productPrice = '$15.00';
              break;
            case 'lifetime_vip':
              productInfo = 'VIP Access - Lifetime';
              productPrice = '$25.00';
              break;
            case 'boost_1month':
              productInfo = 'Discord Boost - 1 Month (30 Boosts)';
              productPrice = '$19.99';
              break;
            case 'boost_3month':
              productInfo = 'Discord Boost - 3 Months (90 Boosts)';
              productPrice = '$26.99';
              break;
            default:
              productInfo = 'Unknown Product';
              productPrice = 'Unknown Price';
          }

          // Send confirmation message with appropriate product links
          const productEmbed = new EmbedBuilder()
            .setTitle('<:purplearrow:1337594384631332885> **PRODUCT SELECTED**')
            .setDescription(`***You have selected: ${productInfo}***`)
            .setColor(0x9B59B6)
            .setTimestamp()
            .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png');

          // Add fields based on product type
          productEmbed.addFields({ 
            name: '**Price**', 
            value: `<:PAYPAL:1337607920447131769> ${productPrice} (For the day)`, 
            inline: true 
          });

          // Add appropriate product links based on selection
          if (product.includes('vip')) {
            productEmbed.addFields({ 
              name: '**__VIP__**', 
              value: '> **Lifetime:** [Copy Me](https://www.roblox.com/catalog/98202400395342)\n> **Month:** [Copy Me](https://www.roblox.com/catalog/85144990668024)\n> **Week:** [Copy Me](https://www.roblox.com/catalog/87544796577389)'
            });
          } else if (product.includes('boost')) {
            productEmbed.addFields({
              name: 'Payment',
              value: 'PayPal: https://paypal.me/d1chelsa (Send as Friends & Family)'
            });
          } else {
            // Standard bot packages
            productEmbed.addFields({ 
              name: '**__Bot Packages__**', 
              value: '> **40 Bots:** [Copy Me](https://www.roblox.com/catalog/109981296260142)\n> **30 Bots:** [Copy Me](https://www.roblox.com/catalog/138973868529963)\n> **25 Bots:** [Copy Me](https://www.roblox.com/catalog/114907246125026)\n> **20 Bots:** [Copy Me](https://www.roblox.com/catalog/90251095378460)\n> **15 Bots:** [Copy Me](https://www.roblox.com/catalog/114311203640066)\n> **10 Bots:** [Copy Me](https://www.roblox.com/catalog/110507656911368)'
            });

            // Add full server option if applicable
            if (product.includes('full_server') || product.includes('refill')) {
              productEmbed.addFields({ 
                name: '**__Full Server__**', 
                value: '> **Full Server:** [Copy Me](https://www.roblox.com/catalog/101932399625607)\n> **Refill:** [Copy Me](https://www.roblox.com/catalog/133192264732348)'
              });
            }
          }

          // Add payment instructions instead of "next steps"
          productEmbed.addFields({ 
            name: '**<:PurpleLine:1336946927282950165> Payment**', 
            value: '**Please complete your purchase and use `/orderproof` to submit your order details.**'
          });

          await channel.send({ embeds: [productEmbed] });
          await interaction.editReply('✅ Product selection confirmed!');

          // Log to webhook
          try {
            const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
            const { WebhookClient } = require('discord.js');
            const webhook = new WebhookClient({ url: webhookUrl });

            const logEmbed = new EmbedBuilder()
              .setTitle('Product Selected')
              .setDescription(`A product has been selected in ${channel.name}`)
              .addFields(
                { name: 'User', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                { name: 'Product', value: productInfo, inline: true },
                { name: 'Price', value: productPrice, inline: true },
                { name: 'Channel', value: `<#${channel.id}>`, inline: false }
              )
              .setColor(0x9B59B6)
              .setTimestamp();

            await webhook.send({ embeds: [logEmbed] });
          } catch (webhookError) {
            console.error('Error sending webhook:', webhookError);
          }

        } catch (error) {
          console.error('Error with product selection:', error);
          await interaction.editReply('❌ There was an error with your product selection!');
        }
      }

      // Claim ticket button
      else if (interaction.customId === 'claim_ticket') {
        await interaction.deferReply({ ephemeral: true });

        try {
          const channel = interaction.channel;
          const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';

          // Check if the user has the staff role
          const member = interaction.guild.members.cache.get(interaction.user.id);
          if (!member.roles.cache.has(staffRoleId)) {
            return interaction.editReply('❌ You do not have permission to claim this ticket!');
          }

          // Update ticket data with claim information
          if (global.activeTickets.has(channel.id)) {
            const ticketData = global.activeTickets.get(channel.id);
            ticketData.claimedBy = interaction.user.id;
            ticketData.claimedAt = new Date();
            global.activeTickets.set(channel.id, ticketData);
          }

          // Send claim confirmation
          const claimEmbed = new EmbedBuilder()
            .setTitle('<:purplearrow:1337594384631332885> **TICKET CLAIMED**')
            .setDescription(`This ticket has been claimed by ${interaction.user.tag}`)
            .setColor(0x9B59B6)
            .setTimestamp();

          await channel.send({ embeds: [claimEmbed] });
          await interaction.editReply('✅ Ticket claimed successfully!');

          // Disable the claim button
          await interaction.channel.send({
            components: [new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Claim Ticket')
                .setStyle(ButtonStyle.Success)
                .setEmoji('👤')
                .setDisabled(true)
            )]
          });

          // Log to webhook
          try {
            const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
            const { WebhookClient } = require('discord.js');
            const webhook = new WebhookClient({ url: webhookUrl });

            const logEmbed = new EmbedBuilder()
              .setTitle('Ticket Claimed')
              .setDescription(`Ticket ${channel.name} has been claimed by ${interaction.user.tag}`)
              .addFields(
                { name: 'Claimed By', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                { name: 'Channel', value: `<#${channel.id}>`, inline: false }
              )
              .setColor(0x9B59B6)
              .setTimestamp();

            await webhook.send({ embeds: [logEmbed] });
          } catch (webhookError) {
            console.error('Error sending webhook:', webhookError);
          }

          // Send notification to order list channel
          try {
            const orderListChannelId = '1347749924611293184';
            const orderListChannel = client.channels.cache.get(orderListChannelId);

            if (orderListChannel) {
              // Try to extract the username from the channel name
              let username = 'unknown';
              if (channel.name.includes('-')) {
                username = channel.name.split('-')[1];
              }

              // Find the ticket creator if available
              let ticketCreator = 'Unknown User';
              if (global.activeTickets && global.activeTickets.has(channel.id)) {
                const ticketData = global.activeTickets.get(channel.id);
                if (ticketData.userId) {
                  ticketCreator = `<@${ticketData.userId}>`;
                }
              }

              const orderListEmbed = new EmbedBuilder()
                .setTitle('<:alting:1336938112261029978> **TICKET CLAIMED**')
                .setDescription(`Ticket ${channel.name} has been claimed by ${interaction.user}`)
                .addFields(
                  { name: 'Ticket', value: `<#${channel.id}>`, inline: true },
                  { name: 'User', value: ticketCreator, inline: true },
                  { name: 'Claimed By', value: `${interaction.user}`, inline: true },
                  { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                )
                .setColor(0x9B59B6)
                .setTimestamp();

              await orderListChannel.send({ content: `${interaction.user}`, embeds: [orderListEmbed] });
            }
          } catch (channelError) {
            console.error('Error sending to order list channel:', channelError);
          }

        } catch (error) {
          console.error('Error claiming ticket:', error);
          await interaction.editReply('❌ There was an error claiming this ticket!');
        }
      }

    }
  } catch (interactionError) {
    console.error('Error handling interaction:', interactionError);
  }
});

// Initialize Express server for keep-alive
const express = require('express');
const app = express();

// Add some basic routes
app.get('/', (req, res) => {
  res.send('Discord Bot is online!');
});

app.get('/health', (req, res) => {
  res.status(200).send('Healthy');
});

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

// Log in to Discord
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});
client.login(process.env.DISCORD_TOKEN);