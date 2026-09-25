import {
  finishVoiceSession,
  moveVoiceSession,
  startVoiceSession,
} from '../database/db.js';

export default (client) => {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const member = newState.member ?? oldState.member;

    if (!member || member.user.bot) return;

    const guildId = member.guild.id;
    const userId = member.id;

    try {
      if (!oldState.channelId && newState.channelId) {
        await startVoiceSession(guildId, userId, newState.channelId);
        return;
      }

      if (oldState.channelId && !newState.channelId) {
        const seconds = await finishVoiceSession(guildId, userId);

        if (seconds > 0) {
          console.log(`${member.user.tag} sumó ${seconds}s de voice.`);
        }
        return;
      }

      if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        await moveVoiceSession(guildId, userId, newState.channelId);
      }
    } catch (error) {
      console.error(`Error procesando voiceStateUpdate para ${userId}:`, error);
    }
  });
};
