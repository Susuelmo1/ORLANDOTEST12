const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { WEBHOOKS } = require('../utils/webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffguide')
    .setDescription('Displays a comprehensive guide for staff members'),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const ownersIds = ['523693281541095424', '1011347151021953145'];

      // Check if user is staff or owner
      const isStaff = interaction.member.roles.cache.has(staffRoleId);
      const isOwner = ownersIds.includes(interaction.user.id);

      if (!isStaff && !isOwner) {
        return interaction.editReply('❌ You do not have permission to use this command!');
      }

      // Create guide embed
      const guideEmbed = new EmbedBuilder()
        .setTitle('@.lock$ @-𝐒𝐞𝐫𝐯𝐞𝐫 𝐀𝐥𝐭𝐞𝐫\n<:purplearrow:1337594384631332885> **STAFF GUIDE**')
        .setDescription('***This guide explains all staff commands and workflows.***')
        .addFields(
          { 
            name: '**__🎫 TICKET MANAGEMENT__**',
            value: `
• **Claim Ticket:** Click the \`Claim Ticket\` button in any ticket to assign yourself.
• **Close Ticket:** Click the \`Close Ticket\` button to close a ticket.
• **/ticketmaker:** Creates a ticket panel in the current channel.`
          },
          {
            name: '**__🔑 KEY MANAGEMENT__**',
            value: `
• **/generatekey [user] [package] [duration]:** Generates a key for a customer.
  > Example: \`/generatekey @user 15 7\` (15 bots for 7 days)
  > Queue updates are sent to <#1346304963445260338>
  > Staff will be notified for all orders`
          },
          {
            name: '**__📋 ORDER MANAGEMENT__**',
            value: `
• **/orderstart [key] [servercode]:** Start an order with the provided key and ERLC server code.
  > Example: \`/orderstart F778D3D5A548DF3CE7BB9938665367C6 erlccode123\`
  > This will dispatch Roblox accounts to the server automatically
  > Order start notifications are sent to <#${WEBHOOKS.PRIMARY.split('/').pop().split('/')[0]}>

• **/orderend [orderid] [user1] [duration1] [user2?] [duration2?] [user3?] [duration3?] [notes?]:** End an active order.
  > Example: \`/orderend 0BBB4ECD @staff1 60\` (End order with staff working 60 minutes)
  > All order completions are logged to <#${WEBHOOKS.ORDER_COMPLETION.split('/').pop().split('/')[0]}>

• **/ordercancel [orderid] [reason]:** Cancel an active order.
  > Example: \`/ordercancel 0BBB4ECD "Customer requested cancellation"\``
          },
          {
            name: '**__👤 SHIFT MANAGEMENT__**',
            value: `
• **/shiftstart:** Start your staff shift.
• **/shiftend:** End your staff shift with detailed statistics.`
          },
          {
            name: '**__🔧 MODERATION__**',
            value: `
• **/softban [user] [reason]:** Temporarily ban a user.
• **/ban [user] [reason]:** Permanently ban a user.
• **/kick [user] [reason]:** Kick a user from the server.`
          },
          {
            name: '**__💾 WEBHOOK SYSTEM__**',
            value: `
• **Order Logs:** <#${WEBHOOKS.PRIMARY.split('/').pop().split('/')[0]}>
• **Order Completion:** <#${WEBHOOKS.ORDER_COMPLETION.split('/').pop().split('/')[0]}>
• **Queue Updates:** <#${WEBHOOKS.QUEUE_UPDATES.split('/').pop().split('/')[0]}>`
          }
        )
        .setColor(0x9B59B6)
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setFooter({ text: 'ERLC Alting Support | Staff Guide' });

      await interaction.editReply({ embeds: [guideEmbed], ephemeral: true });

    } catch (error) {
      console.error('Error displaying staff guide:', error);
      await interaction.editReply('❌ There was an error displaying the staff guide! Please try again or contact an administrator.');
    }
  }
};