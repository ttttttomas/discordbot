import 'dotenv/config';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { initDatabase } from './database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await initDatabase();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'))) {
  const module = await import(pathToFileURL(path.join(commandsPath, file)).href);
  const command = module.default;

  if (!command?.name || typeof command.execute !== 'function') {
    console.warn(`Comando inválido ignorado: ${file}`);
    continue;
  }

  client.commands.set(command.name, command);
}

const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'))) {
  const module = await import(pathToFileURL(path.join(eventsPath, file)).href);

  if (typeof module.default !== 'function') {
    console.warn(`Evento inválido ignorado: ${file}`);
    continue;
  }

  module.default(client);
}

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild || !message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(`Error al ejecutar !${commandName}:`, error);
    await message.reply('Hubo un error al ejecutar el comando.');
  }
});

const token = process.env.DISCORD_TOKEN;

if (!token) {
  throw new Error('Falta DISCORD_TOKEN en las variables de entorno.');
}

await client.login(token);
