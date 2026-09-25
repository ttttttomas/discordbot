# Discord Voice Time Bot

Bot de Discord que registra cuánto tiempo pasa cada usuario en canales de voz y muestra un ranking semanal con `!voicetime`.

## Funcionalidad

- Registra entradas y salidas de voice.
- Suma el tiempo acumulado por servidor y usuario.
- Mantiene sesiones activas durante reinicios del bot.
- Incluye a los usuarios que siguen conectados al ejecutar `!voicetime`.
- Reinicia el ranking automáticamente cada domingo a las 00:00.
- Ignora bots.
- Usa SQLite para persistencia.
- Compatible con Railway + Volume.

## Variables de entorno

Copiá `.env.example` como referencia:

```env
DISCORD_TOKEN=tu_token
DATA_DIR=/data
RESET_CRON=0 0 * * 0
RESET_TIMEZONE=America/Argentina/Buenos_Aires
```

## Desarrollo local

```bash
npm install
npm start
```

## Railway

1. Crear un nuevo proyecto en Railway desde este repositorio.
2. Configurar `DISCORD_TOKEN`.
3. Agregar un Volume y montarlo en `/data`.
4. Configurar `DATA_DIR=/data`.
5. Opcionalmente configurar:
   - `RESET_CRON=0 0 * * 0`
   - `RESET_TIMEZONE=America/Argentina/Buenos_Aires`
6. Railway ejecutará `npm start`.

El archivo SQLite quedará en:

```
/data/voice_times.db
```

El Volume es importante. Sin él, la base puede perderse al redesplegar o recrear el contenedor.

## Discord Developer Portal

El bot necesita estos Gateway Intents:

- Server Members Intent: no es necesario.
- Message Content Intent: habilitado para detectar `!voicetime`.
- Guild Voice States se solicita desde el código y no requiere privileged intent.

## Comandos

### `!voicetime`

Muestra el ranking semanal del servidor:

```
Tiempo en voice esta semana:
1. @Usuario — 1d 2h 14m 33s
2. @Usuario2 — 5h 11m 8s
```
