const rulesEmbed = new EmbedBuilder()
.setTitle('ERLC Alting Rules')
.setDescription('Welcome to ERLC ALTING SERVER! Please follow the rules below to keep everything calm and steady. Violations will result in warnings and penalties.')
.addFields(
  { 
    name: '**<:1_:1337594940179353681> Respect**',
    value: 'Treat everyone with respect. Disrespect of any kind will not be tolerated.\n<:PurpleLine:1336946927282950165>'
  },
  { 
    name: '**<:2_:1337594974233165958> Bullying & Harassment**',
    value: 'Bullying, harassment, and targeting members are prohibited and will result in penalties.\n<:PurpleLine:1336946927282950165>'
  },
  { 
    name: '**<:3_:1337595007548264448> Advertising**',
    value: 'Advertising is strictly prohibited, including DM advertising.\n<:PurpleLine:1336946927282950165>'
  },
  { 
    name: '**<:4_:1337594940179353681> Discord Terms of Service**',
    value: 'Comply with the Discord Terms of Service at all times. Violations will not be tolerated.\n<:PurpleLine:1337594940179353681>'
  },
  { 
    name: '**<:5_:1337594974233165958> Pinging Staff**',
    value: 'Do not spam ping staff members. Use the ticket system for support.\n<:PurpleLine:1337594940179353681>'
  },
  { 
    name: '**<:6_:1337595007548264448> Channel Usage**',
    value: 'Use each channel for its designated purpose (e.g., media for Media).\n<:PurpleLine:1337594940179353681>'
  },
  { 
    name: '**<:7_:1337594974233165958> Private Information**',
    value: 'Do not share personal information. This will result in harsh moderation actions.\n<:PurpleLine:1337594940179353681>'
  }
)
.addFields( // Add this for penalties
  {
    name: '**<:PurpleLine:1336946927282950165> Penalties**',
    value: '**3 Warnings:** Softban/Kick | **6 Warnings:** Temp Ban (6-12 Days) | **8 Warnings:** Permanent Ban'
  }
);