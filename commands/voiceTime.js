import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Obtener __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al archivo JSON
const dataPath = path.join(__dirname, '../database/voice_time.json');

function timeInMinutes(time) {
  return Math.floor(time / 60);
}

function timeInHours(time) {
  return Math.floor(time / 3600);
}

function timeInDays(time) {
  return Math.floor(time / 86400);
}

export default {
  name: 'voicetime',
  description: 'Muestra el tiempo en voz de los usuarios.',
  async execute(message) {
    console.log('Comando !voicetime recibido'); // Depuración
    try {
      if (!fs.existsSync(dataPath)) {
        console.log('El archivo voice_time.json no existe. Creando uno nuevo...'); // Depuración
        fs.writeFileSync(dataPath, JSON.stringify({}, null, 2));
        return message.reply('No hay datos de tiempo en voz. Se ha creado un nuevo archivo.');
      }
  
      const data = fs.readFileSync(dataPath, 'utf8');
      console.log('Datos leídos del archivo:', data); // Depuración
      const userVoiceTime = JSON.parse(data);
  
      if (Object.keys(userVoiceTime).length === 0) {
        console.log('No hay datos de tiempo en voz.'); // Depuración
        return message.reply('No hay datos de tiempo en voz.');
      }
  
      const leaderboard = Object.entries(userVoiceTime)
        .map(([userId, startTime]) => {
          const timeSpent = Math.floor((Date.now() - startTime) / 1000);
          const timeMinutes = timeInMinutes(timeSpent);
          const timeHours = timeInHours(timeSpent);
          console.log(timeMinutes)
          const timeDays = timeInDays(timeSpent);
          return `<@${userId}>: ${timeSpent} segundos, ${timeMinutes} minutos, ${timeHours} horas, ${timeDays} días`;
        })
        .join('\n');
  
      console.log('Enviando lista de tiempos en voz:', leaderboard); // Depuración1
      message.channel.send(`**Tiempo en voz de los usuarios:**\n${leaderboard}`);
    } catch (error) {
      console.error('Error al leer el archivo JSON:', error);
      message.reply('Hubo un error al procesar el comando. Por favor, intenta nuevamente.');
    }
  },
};