export default (client) => {
    client.once('ready', () => {
      console.log(`Bot conectado como ${client.user.tag}`);
    });
  };