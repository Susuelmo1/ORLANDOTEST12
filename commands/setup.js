
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set up the bot configuration')
    .addSubcommand(subcommand =>
      subcommand
        .setName('webhook')
        .setDescription('Set up the logging webhook')
        .addStringOption(option =>
          option.setName('url')
            .setDescription('The webhook URL for logging')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('staffrole')
        .setDescription('Set the staff role ID')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The staff role')
            .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Only owners can use this command
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      if (!ownersIds.includes(interaction.user.id)) {
        return interaction.editReply('❌ Only the bot owner can use this command!');
      }

      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'webhook') {
        const webhookUrl = interaction.options.getString('url');
        
        // Validate webhook URL format
        if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
          return interaction.editReply('❌ Invalid webhook URL format. Please provide a valid Discord webhook URL.');
        }
        
        // Create or update .env file
        try {
          // Check if .env file exists
          const envPath = path.join(process.cwd(), '.env');
          let envContent = '';

          if (fs.existsSync(envPath)) {
            // Read current .env content
            envContent = fs.readFileSync(envPath, 'utf8');
            
            // Check if LOG_WEBHOOK_URL already exists and replace it
            if (envContent.includes('LOG_WEBHOOK_URL=')) {
              envContent = envContent.replace(/LOG_WEBHOOK_URL=.*/g, `LOG_WEBHOOK_URL=${webhookUrl}`);
            } else {
              // Add LOG_WEBHOOK_URL to the end
              envContent += `\nLOG_WEBHOOK_URL=${webhookUrl}`;
            }
          } else {
            // Create new .env with webhook URL
            envContent = `LOG_WEBHOOK_URL=${webhookUrl}`;
          }

          // Write updated content to .env file
          fs.writeFileSync(envPath, envContent);
          
          // Update environment variable at runtime
          process.env.LOG_WEBHOOK_URL = webhookUrl;
          
          // Create success embed
          const successEmbed = new EmbedBuilder()
            .setTitle('<:purplearrow:1337594384631332885> **WEBHOOK CONFIGURED**')
            .setDescription('***The logging webhook has been set up successfully!***')
            .addFields(
              { name: '**<:PurpleLine:1336946927282950165> What\'s Next?**', value: '> The bot will now log important events to this webhook.\n> Test it by using commands like `/orderproof`, `/generatekey`, etc.' }
            )
            .setColor(0x9B59B6)
            .setFooter({ text: 'ERLC Alting Support' })
            .setTimestamp();
            
          await interaction.editReply({ embeds: [successEmbed] });
          
          // Test the webhook
          const { WebhookClient } = require('discord.js');
          try {
            const webhook = new WebhookClient({ url: webhookUrl });
            const testEmbed = new EmbedBuilder()
              .setTitle('Webhook Test')
              .setDescription('Your webhook has been configured successfully!')
              .addFields(
                { name: 'Set By', value: interaction.user.tag, inline: true },
                { name: 'Server', value: interaction.guild.name, inline: true }
              )
              .setColor(0x9B59B6)
              .setFooter({ text: 'ERLC Alting Support' })
              .setTimestamp();
              
            await webhook.send({ embeds: [testEmbed] });
          } catch (webhookError) {
            console.error('Error testing webhook:', webhookError);
            await interaction.followUp({ 
              content: '⚠️ Webhook URL was saved but test message failed. Please check if the URL is correct.',
              ephemeral: true
            });
          }
        } catch (fileError) {
          console.error('Error updating .env file:', fileError);
          await interaction.editReply('❌ There was an error saving the webhook URL to the .env file. Please try again.');
        }
      } else if (subcommand === 'staffrole') {
        const role = interaction.options.getRole('role');
        
        // Create or update .env file
        try {
          const envPath = path.join(process.cwd(), '.env');
          let envContent = '';

          if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
            
            if (envContent.includes('STAFF_ROLE_ID=')) {
              envContent = envContent.replace(/STAFF_ROLE_ID=.*/g, `STAFF_ROLE_ID=${role.id}`);
            } else {
              envContent += `\nSTAFF_ROLE_ID=${role.id}`;
            }
          } else {
            envContent = `STAFF_ROLE_ID=${role.id}`;
          }

          fs.writeFileSync(envPath, envContent);
          
          // Update environment variable at runtime
          process.env.STAFF_ROLE_ID = role.id;
          
          const successEmbed = new EmbedBuilder()
            .setTitle('<:purplearrow:1337594384631332885> **STAFF ROLE CONFIGURED**')
            .setDescription('***The staff role has been set up successfully!***')
            .addFields(
              { name: '**Role**', value: `<@&${role.id}>`, inline: true },
              { name: '**Role ID**', value: `\`${role.id}\``, inline: true },
              { name: '**<:PurpleLine:1336946927282950165> What\'s Next?**', value: '> Members with this role will now have access to staff commands.\n> This includes: `/ticketmaker`, `/generatekey`, `/orderid`, etc.' }
            )
            .setColor(0x9B59B6)
            .setFooter({ text: 'ERLC Alting Support' })
            .setTimestamp();
            
          await interaction.editReply({ embeds: [successEmbed] });
        } catch (fileError) {
          console.error('Error updating .env file:', fileError);
          await interaction.editReply('❌ There was an error saving the staff role ID to the .env file. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error with setup command:', error);
      await interaction.editReply('❌ There was an error executing the setup command!');
    }
  }
};
