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
        console.log("user connected")
      userVoiceTime[userId] = Date.now(); // Guarda el tiempo de conexión
      saveData(); // Guarda los datos en el archivo
    }

    // Usuario se desconecta de un canal de voz
    if (oldState.channelId && !newState.channelId) {
      if (userVoiceTime[userId]) {
        console.log("user disconnected")
        const timeSpent = Math.floor((Date.now() - userVoiceTime[userId]) / 1000); // Tiempo en segundos
        console.log(`${newState.member.user.tag} pasó ${timeSpent} segundos en el canal de voz.`);
        saveData(); // Guarda los datos en el archivo
        if (saveData){
            console.log("data guardada!")
        }
      }
    }
  });
};