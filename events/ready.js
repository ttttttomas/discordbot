import cron from 'node-cron';
import {
  deleteVoiceSession,
  ensureWeeklyReset,
  listActiveSessions,
  reconcileVoiceSession,
  resetWeeklyData,
} from '../database/db.js';

const RESET_CRON = process.env.RESET_CRON || '0 0 * * 0';
const RESET_TIMEZONE = process.env.RESET_TIMEZONE || 'America/Argentina/Buenos_Aires';

async function reconcileActiveSessions(client) {
  const storedSessions = await listActiveSessions();
  const currentSessions = new Map();

  for (const guild of client.guilds.cache.values()) {
    for (const voiceState of guild.voiceStates.cache.values()) {
      const member = voiceState.member;
      if (!member || member.user.bot || !voiceState.channelId) continue;

      const key = `${guild.id}:${member.id}`;
      currentSessions.set(key, {
        guildId: guild.id,
        userId: member.id,
        channelId: voiceState.channelId,
      });
    }
  }

  for (const session of currentSessions.values()) {
    await reconcileVoiceSession(
      session.guildId,
      session.userId,
      session.channelId,
      Date.now(),
    );
  }

  for (const session of storedSessions) {
    const key = `${session.guild_id}:${session.user_id}`;

    if (!currentSessions.has(key)) {
      await deleteVoiceSession(session.guild_id, session.user_id);
    }
  }
}

export default (client) => {
  client.once('ready', async () => {
    try {
      const resetRecovered = await ensureWeeklyReset();
      await reconcileActiveSessions(client);

      if (resetRecovered) {
        console.log('Se aplicó un reset semanal pendiente.');
      }

      console.log(`Bot conectado como ${client.user.tag} en ${client.guilds.cache.size} servidor(es).`);
    } catch (error) {
      console.error('Error al inicializar sesiones de voice:', error);
    }

    if (!cron.validate(RESET_CRON)) {
      console.error(`RESET_CRON inválido: ${RESET_CRON}. No se programó el reset automático.`);
      return;
    }

    try {
      cron.schedule(
        RESET_CRON,
        async () => {
          try {
            await resetWeeklyData(Date.now());
            console.log('Se reiniciaron los tiempos de voz semanales.');
          } catch (error) {
            console.error('Error durante el reset semanal:', error);
          }
        },
        { timezone: RESET_TIMEZONE },
      );

      console.log(`Reset semanal programado con "${RESET_CRON}" (${RESET_TIMEZONE}).`);
    } catch (error) {
      console.error('No se pudo programar el reset semanal:', error);
    }
  });
};
