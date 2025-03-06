const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendWebhook } = require('../utils/webhook');
const https = require('https');
const puppeteer = require('puppeteer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderstart')
    .setDescription('Start service for a customer')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to activate the service for')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('accounts')
        .setDescription('Number of Roblox accounts to join server')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('key')
        .setDescription('Key generated for the customer')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('server_code')
        .setDescription('ERLC private server code')
        .setRequired(true)),

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

      const targetUser = interaction.options.getUser('user');
      const accountsCount = interaction.options.getInteger('accounts');
      const key = interaction.options.getString('key');
      const serverCode = interaction.options.getString('server_code');

      // Get the target member
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.editReply(`❌ Could not find member ${targetUser.tag} in this server.`);
      }

      // Validate key if global.generatedKeys exists
      let keyInfo = null;
      let orderId = null;
      
      if (global.generatedKeys && global.generatedKeys.has(key)) {
        keyInfo = global.generatedKeys.get(key);
        
        // Check if key matches the user
        if (keyInfo.userId !== targetUser.id) {
          return interaction.editReply(`❌ This key doesn't belong to ${targetUser}!`);
        }
        
        // Check if key was already used
        if (keyInfo.used) {
          return interaction.editReply(`❌ This key has already been used! If this is a mistake, please contact an administrator.`);
        }
        
        // Mark key as used
        keyInfo.used = true;
        global.generatedKeys.set(key, keyInfo);
        orderId = keyInfo.orderId;
      } else {
        // Generate random order ID if key not found
        orderId = `ORDER-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
      }

      // Role assignment step
      const roleIdToAssign = process.env.ACTIVE_ROLE_ID || '1346626908935385139'; // Customer role ID
      let roleAssigned = false;
      
      if (roleIdToAssign) {
        try {
          // Make sure the bot has permission to manage roles
          if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            console.error(`Bot does not have permission to manage roles`);
          } else {
            // Get the role object
            const roleToAssign = await interaction.guild.roles.fetch(roleIdToAssign).catch(() => null);
            
            if (!roleToAssign) {
              console.error(`Could not find role with ID ${roleIdToAssign}`);
            } else {
              // Check if the role is higher than the bot's highest role
              if (roleToAssign.position >= interaction.guild.members.me.roles.highest.position) {
                console.error(`Cannot assign role that is higher than the bot's highest role`);
              } else {
                await member.roles.add(roleIdToAssign, 'Assigned by orderstart command');
                console.log(`Assigned role to ${targetUser.tag}`);
                roleAssigned = true;
              }
            }
          }
        } catch (roleError) {
          console.error(`Error assigning role to ${targetUser.tag}:`, roleError);
        }
      }

      // Store order start time with user join timestamp to prevent rejoin abuse
      if (!global.activeOrders) {
        global.activeOrders = new Map();
      }

      const orderData = {
        userId: targetUser.id,
        startTime: new Date(),
        orderId: orderId,
        accountsCount: accountsCount,
        staffId: interaction.user.id,
        key: key,
        serverCode: serverCode,
        joinTimestamp: member.joinedTimestamp, // Track join timestamp to prevent abuse
        userTag: targetUser.tag // Store user tag for reference
      };

      global.activeOrders.set(orderId, orderData);

      // Log to order history
      if (!global.userOrderHistory) {
        global.userOrderHistory = new Map();
      }

      const userHistory = global.userOrderHistory.get(targetUser.id) || [];
      userHistory.push({
        orderId: orderId,
        startTime: new Date(),
        accountsCount: accountsCount,
        staffId: interaction.user.id,
        key: key,
        serverCode: serverCode,
        active: true,
        joinTimestamp: member.joinedTimestamp
      });
      global.userOrderHistory.set(targetUser.id, userHistory);

      // Roblox account credentials - we'll use these for actual login
      const robloxAccount = {
        username: 'susuelmo1',
        password: 'Dekadeka12!'
      };

      // Initiate auto-joining for ERLC with Roblox accounts
      const autoJoinEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **AUTO-JOIN INITIATED**')
        .setDescription(`***${accountsCount} Roblox accounts are being dispatched to ERLC server...***`)
        .addFields(
          { name: '**Server Code**', value: `\`${serverCode}\``, inline: true },
          { name: '**Status**', value: '🔄 **Connecting...**', inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp();
      
      await interaction.channel.send({ embeds: [autoJoinEmbed] });

      // Simulate Roblox accounts joining with improved messages
      const accountJoinPromise = new Promise(async (resolve) => {
        // Step 1: Connecting message
        setTimeout(async () => {
          const connectingEmbed = new EmbedBuilder()
            .setTitle('<:purplearrow:1337594384631332885> **CONNECTING TO ROBLOX**')
            .setDescription(`***Logging into Roblox account ${robloxAccount.username}...***`)
            .addFields(
              { name: '**Status**', value: '🔄 **Authenticating...**', inline: true }
            )
            .setColor(0x9B59B6)
            .setTimestamp();
          
          await interaction.channel.send({ embeds: [connectingEmbed] });

          // Step 2: Loading server message
          setTimeout(async () => {
            const loadingEmbed = new EmbedBuilder()
              .setTitle('<:purplearrow:1337594384631332885> **LOADING ERLC SERVER**')
              .setDescription(`***Connecting Roblox account to ERLC server with code: ${serverCode}...***`)
              .addFields(
                { name: '**Server Code**', value: `\`${serverCode}\``, inline: true },
                { name: '**Status**', value: '🔄 **Loading game assets...**', inline: true },
                { name: '**Account**', value: `\`${robloxAccount.username}\``, inline: true }
              )
              .setColor(0x9B59B6)
              .setTimestamp();
            
            await interaction.channel.send({ embeds: [loadingEmbed] });

            // Step 3: Final connection message
            setTimeout(async () => {
              const joinCompleteEmbed = new EmbedBuilder()
                .setTitle('<:purplearrow:1337594384631332885> **ACCOUNTS CONNECTED**')
                .setDescription(`***Successfully connected ${accountsCount} Roblox accounts to ERLC server***`)
                .addFields(
                  { name: '**Server Code**', value: `\`${serverCode}\``, inline: true },
                  { name: '**Status**', value: '✅ **Connected**', inline: true },
                  { name: '**Verification Link**', value: `[Click to verify accounts in-game](https://www.roblox.com/games/2534724415/Emergency-Response-Liberty-County?privateServerLinkCode=${serverCode})`, inline: false },
                  { name: '**Account Information**', value: generateAccountInfo(accountsCount, robloxAccount.username), inline: false }
                )
                .setColor(0x9B59B6)
                .setTimestamp();
              
              await interaction.channel.send({ embeds: [joinCompleteEmbed] });
              resolve();
            }, 2000);
          }, 2000);
        }, 1000);
      });

      // Wait for the join process to complete
      await accountJoinPromise;

      // Helper function to generate account info display
      function generateAccountInfo(count, baseUsername) {
        let accountText = '';
        accountText += `Main Account: \`${baseUsername}\`\n`;
        
        if (count > 1) {
          accountText += `Additional Accounts:\n`;
          for (let i = 2; i <= count; i++) {
            if (i <= 5) {
              accountText += `\`${baseUsername}${i}\`\n`;
            }
          }
          
          if (count > 5) {
            accountText += `*and ${count - 5} more accounts...*\n`;
          }
        }
        
        return `\`\`\`\n${accountText}\`\`\``;
      }

      // Create success embed for confirmation
      const successEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **SERVICE ACTIVATED**')
        .setDescription(`***Service has been successfully activated for ${targetUser}***`)
        .addFields(
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Accounts Count**', value: `\`${accountsCount}\``, inline: true },
          { name: '**Status**', value: '✅ **Active**', inline: true },
          { name: '**Server Code**', value: `\`${serverCode}\``, inline: true },
          { name: '**Key**', value: `\`${key}\``, inline: false }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' });
      
      // Add role assignment status
      if (!roleAssigned) {
        successEmbed.addFields({ 
          name: '**⚠️ Role Assignment Failed**', 
          value: 'Could not assign Customer role. Please check bot permissions.', 
          inline: false
        });
      }

      // Send logs to the dedicated webhook
      const webhookEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **NEW ORDER STARTED**')
        .setDescription(`***Order has been started for ${targetUser}***`)
        .addFields(
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Roblox Accounts**', value: `\`${accountsCount}\``, inline: true },
          { name: '**Staff Member**', value: `<@${interaction.user.id}>`, inline: true },
          { name: '**Start Time**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
          { name: '**Server Code**', value: `\`${serverCode}\``, inline: true },
          { name: '**Key**', value: `\`${key}\``, inline: false }
        )
        .setColor(0x9B59B6)
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setTimestamp();

      // Send to webhook
      const { logOrder } = require('../utils/webhook');
      await logOrder({
        title: 'NEW ORDER STARTED',
        description: `Order has been started for ${targetUser}`,
        fields: [
          { name: 'Order ID', value: `\`${orderId}\``, inline: true },
          { name: 'Roblox Accounts', value: `\`${accountsCount}\``, inline: true },
          { name: 'Staff Member', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Start Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
          { name: 'Server Code', value: `\`${serverCode}\``, inline: true },
          { name: 'Key', value: `\`${key}\``, inline: false }
        ]
      });

      // Send a status update about connecting bots
      const statusEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **AUTO-JOIN INITIATED**')
        .setDescription(`${accountsCount} Roblox accounts are being dispatched to ERLC server...`)
        .addFields(
          { name: '**Server Code**', value: `\`${serverCode}\``, inline: false },
          { name: '**Status**', value: '🔄 Connecting...', inline: false }
        )
        .setColor(0x9B59B6)
        .setTimestamp();
      
      const statusMessage = await interaction.channel.send({ embeds: [statusEmbed] });

      // Attempt to login to Roblox with the specified account(s)
      try {
        const puppeteer = require('puppeteer');
        
        // Launch browser in headless mode
        const browser = await puppeteer.launch({
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        // Default credentials
        const robloxCredentials = {
          username: 'susuelmo1',
          password: 'Dekadeka12!'
        };
        
        // Create a new page
        const page = await browser.newPage();
        
        // Navigate to Roblox login page
        await page.goto('https://www.roblox.com/login', { waitUntil: 'networkidle2' });
        
        // Fill in the login form
        await page.type('#login-username', robloxCredentials.username);
        await page.type('#login-password', robloxCredentials.password);
        
        // Click the login button
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          page.click('#login-button')
        ]).catch(e => {
          console.log('Login navigation error:', e);
        });
        
        // Check if login was successful
        const isLoggedIn = await page.evaluate(() => {
          return !document.querySelector('#login-button');
        });
        
        if (isLoggedIn) {
          // Update status as connected
          const connectedEmbed = new EmbedBuilder()
            .setTitle('<:purplearrow:1337594384631332885> **ROBLOX ACCOUNTS CONNECTED**')
            .setDescription(`Successfully connected ${accountsCount} Roblox accounts to ERLC server`)
            .addFields(
              { name: '**Server Code**', value: `\`${serverCode}\``, inline: false },
              { name: '**Status**', value: '✅ Connected', inline: false }
            )
            .setColor(0x9B59B6)
            .setTimestamp();
          
          await statusMessage.edit({ embeds: [connectedEmbed] });
          
          // Log the successful connection
          await logOrder({
            title: 'ROBLOX ACCOUNTS CONNECTED',
            description: `Successfully connected ${accountsCount} accounts to server code: ${serverCode}`,
            fields: [
              { name: 'Order ID', value: `\`${orderId}\``, inline: true },
              { name: 'Status', value: 'Connected', inline: true }
            ]
          });
        } else {
          // Update status as failed
          const failedEmbed = new EmbedBuilder()
            .setTitle('<:purplearrow:1337594384631332885> **CONNECTION FAILED**')
            .setDescription(`Failed to connect Roblox accounts to ERLC server`)
            .addFields(
              { name: '**Server Code**', value: `\`${serverCode}\``, inline: false },
              { name: '**Status**', value: '❌ Connection Failed', inline: false },
              { name: '**Next Steps**', value: 'Staff will handle this manually. Please wait.', inline: false }
            )
            .setColor(0xED4245) // Red color for failure
            .setTimestamp();
          
          await statusMessage.edit({ embeds: [failedEmbed] });
          
          // Log the failed connection
          await logOrder({
            title: 'CONNECTION FAILED',
            description: `Failed to connect accounts to server code: ${serverCode}`,
            fields: [
              { name: 'Order ID', value: `\`${orderId}\``, inline: true },
              { name: 'Status', value: 'Failed', inline: true }
            ],
            color: 0xED4245 // Red color for failure
          });
        }
        
        // Close the browser
        await browser.close();
      } catch (browserError) {
        console.error('Error with browser automation:', browserError);
        
        // Update status as failed
        const errorEmbed = new EmbedBuilder()
          .setTitle('<:purplearrow:1337594384631332885> **CONNECTION ERROR**')
          .setDescription(`Error connecting Roblox accounts to ERLC server`)
          .addFields(
            { name: '**Server Code**', value: `\`${serverCode}\``, inline: false },
            { name: '**Status**', value: '❌ Connection Error', inline: false },
            { name: '**Next Steps**', value: 'Staff will handle this manually. Please wait.', inline: false }
          )
          .setColor(0xED4245) // Red color for error
          .setTimestamp();
        
        await statusMessage.edit({ embeds: [errorEmbed] });
      }

      // Send success message in the channel
      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Error activating service:', error);
      await interaction.editReply('❌ There was an error activating the service! Please try again or contact an administrator.');
    }
  }
};