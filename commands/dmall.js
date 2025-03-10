
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dmall')
    .setDescription('DM everyone or a specific user')
    .addStringOption(option => 
      option.setName('message')
        .setDescription('The message to send')
        .setRequired(true))
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Specific user to DM (leave empty to message everyone)')
        .setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Check if user is an owner
      const ownersIds = ['523693281541095424', '1011347151021953145']; 
      if (!ownersIds.includes(interaction.user.id)) {
        return interaction.editReply('❌ You do not have permission to use this command!');
      }

      const message = interaction.options.getString('message');
      const targetUser = interaction.options.getUser('user');

      // Create a professional embed for DM
      const dmEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> ERLC Alting Service')
        .setDescription(`${message}`)
        .setColor(0x9B59B6) // Purple color
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setFooter({ text: 'ERLC Alting Support' });

      if (targetUser) {
        // DM just the specified user
        try {
          await targetUser.send({ embeds: [dmEmbed] });
          await interaction.editReply(`✅ Message sent to ${targetUser.tag}`);
        } catch (error) {
          console.error(`Error DMing user ${targetUser.tag}:`, error);
          await interaction.editReply(`❌ Failed to send DM to ${targetUser.tag}. They may have DMs closed.`);
        }
      } else {
        // DM all members in the server
        const guild = interaction.guild;
        const members = await guild.members.fetch();
        let successCount = 0;
        let failCount = 0;

        await interaction.editReply('⏳ Sending DMs to all users... This may take a while.');

        for (const [id, member] of members) {
          // Don't DM bots
          if (member.user.bot) continue;

          try {
            await member.send({ embeds: [dmEmbed] });
            successCount++;
          } catch (error) {
            console.error(`Error DMing user ${member.user.tag}:`, error);
            failCount++;
          }

          // Brief pause to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await interaction.editReply(`✅ Message sent to ${successCount} users. Failed to send to ${failCount} users.`);
      }
    } catch (error) {
      console.error('Error with dmall command:', error);
      await interaction.editReply('❌ There was an error executing this command!');
    }
  }
};
