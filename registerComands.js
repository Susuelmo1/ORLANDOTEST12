async function registerCommands() {
  try {
    const commands = [];
    const commandNames = new Set(); // Initialize a Set to store unique command names
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(`./commands/${file}`);

      if (command && command.data) {
        if (commandNames.has(command.data.name)) {
          console.error(`Duplicate command name found: ${command.data.name}`);
        } else {
          commandNames.add(command.data.name); // Add the name to the Set
          commands.push(command.data.toJSON());
        }
      } else {
        console.error(`Command file ${file} is missing 'data' property.`);
      }
    }

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