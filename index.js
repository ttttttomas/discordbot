import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear el cliente del bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // Para manejar servidores
    GatewayIntentBits.GuildVoiceStates, // Para manejar estados de voz
    GatewayIntentBits.GuildMessages, // Para leer mensajes en servidores
    GatewayIntentBits.MessageContent, // Para leer el contenido de los mensajes
  ],
});

// Registrar comandos
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  client.commands.set(command.default.name, command.default);
}

// Registrar eventos
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = await import(`./events/${file}`);
  event.default(client);
}

// Manejar mensajes
client.on('messageCreate', (message) => {
  console.log(`Mensaje recibido: ${message.content}`); // Depuración

  // Ignorar mensajes de otros bots o que no empiecen con el prefijo "!"
  if (message.author.bot || !message.content.startsWith('!')) return;

  console.log(`Comando detectado: ${message.content}`); // Depuración

  // Extraer el comando y los argumentos
  const args = message.content.slice(1).split(/ +/);
  const commandName = args.shift().toLowerCase();

  // Obtener el comando
  const command = client.commands.get(commandName);
  if (!command) {
    console.log(`Comando no reconocido: ${commandName}`); // Depuración
    return;
  }

  // Ejecutar el comando
  try {
    console.log(`Ejecutando comando: ${commandName}`); // Depuración
    command.execute(message, args);
  } catch (error) {
    console.error(`Error al ejecutar el comando ${commandName}:`, error);
    message.reply('Hubo un error al ejecutar el comando. Por favor, intenta nuevamente.');
  }
});


// Iniciar el bot
client.login('MTM0MzMxODE4OTQzNzg3ODM2Mg.GEsJla.O-993lQT8fBfFVYljdr2JSl03--LgrxC2eah5A');