import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Obtener __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al archivo JSON
const dataPath = path.join(__dirname, '../database/voice_time.json');

// Cargar datos desde el archivo
let userVoiceTime = {};
if (fs.existsSync(dataPath)) {
  userVoiceTime = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}


// Guardar datos en el archivo
function saveData() {
  fs.writeFileSync(dataPath, JSON.stringify(userVoiceTime, null, 2));
}

export default (client) => {
  client.on('voiceStateUpdate', (oldState, newState) => {
      const userId = newState.member.id;

      // Usuario se conecta a un canal de voz
      if (!oldState.channelId && newState.channelId) {
          console.log("User connected");
          userVoiceTime[userId] = userVoiceTime[userId] || 0; // Mantiene tiempo previo si ya existe
          userVoiceTime[`${userId}_start`] = Date.now(); // Guarda hora de conexión
      }

      // Usuario se desconecta de un canal de voz
      if (oldState.channelId && !newState.channelId) {
          console.log("User disconnected");

          if (userVoiceTime[`${userId}_start`]) {
              // Calcula el tiempo pasado
              const timeSpent = Math.floor((Date.now() - userVoiceTime[`${userId}_start`]) / 1000);

              // Suma el tiempo previo al nuevo tiempo
              userVoiceTime[userId] += timeSpent;

              // Borra el tiempo de inicio
              delete userVoiceTime[`${userId}_start`];

              console.log(`${newState.member.user.tag} pasó ${timeSpent} segundos en el canal de voz.`);
              saveData(); // Guarda datos en el JSON
          }
      }
  });
};
