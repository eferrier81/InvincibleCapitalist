import { NestFactory } from '@nestjs/core';
import { networkInterfaces } from 'os';
import { AppModule, ObserveInstrument } from './app.module.js';

/** Adresses IPv4 de la machine sur le réseau local (pour le test d'interopérabilité). */
function adressesReseau(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((iface) => iface !== undefined && iface.family === 'IPv4' && !iface.internal)
    .map((iface) => iface!.address);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  // CORS ouvert : le frontend d'un autre groupe doit pouvoir appeler cette API.
  app.enableCors();
  const port = Number(process.env.PORT ?? 3000);
  // 0.0.0.0 : écoute sur toutes les interfaces, pas seulement localhost,
  // pour que les autres machines du réseau puissent se brancher sur ce backend.
  await app.listen(port, '0.0.0.0');

  console.log(`Backend prêt : http://localhost:${port}/graphql`);
  for (const ip of adressesReseau()) {
    console.log(`Depuis une autre machine du réseau : http://${ip}:${port}/graphql`);
  }
}
await bootstrap();
