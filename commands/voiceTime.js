import { getLeaderboard } from '../database/db.js';

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function splitMessage(lines, maxLength = 1900) {
  const chunks = [];
  let current = '';

  for (const line of lines) {
    if ((current + line + '\n').length > maxLength) {
      if (current) chunks.push(current.trimEnd());
      current = '';
    }

    current += `${line}\n`;
  }

  if (current) chunks.push(current.trimEnd());
  return chunks;
}

export default {
  name: 'voicetime',
  description: 'Muestra el ranking semanal de tiempo en canales de voz.',

  async execute(message) {
    const rows = await getLeaderboard(message.guild.id);

    if (!rows.length) {
      await message.channel.send('Todavía no hay tiempo de voz registrado esta semana.');
      return;
    }

    const lines = ['**Tiempo en voice esta semana:**'];

    rows.slice(0, 50).forEach((row, index) => {
      lines.push(`${index + 1}. <@${row.user_id}> — **${formatTime(row.total_seconds)}**`);
    });

    for (const chunk of splitMessage(lines)) {
      await message.channel.send(chunk);
    }
  },
};
