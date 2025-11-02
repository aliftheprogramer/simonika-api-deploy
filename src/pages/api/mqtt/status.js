// src/pages/api/mqtt/status.js
import runMiddleware, { cors } from '@/lib/cors';
import { initializeMqttClient, getCurrentSubscribeTopic } from '@/lib/mqttClient';

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { MQTT_BROKER_HOST, MQTT_BROKER_PORT } = process.env;

  const mqttClient = initializeMqttClient();

  res.status(200).json({
    connected: mqttClient && mqttClient.connected,
    broker_host: MQTT_BROKER_HOST,
    broker_port: MQTT_BROKER_PORT ? parseInt(MQTT_BROKER_PORT) : undefined,
    subscribed_topic: getCurrentSubscribeTopic(),
    client_id: mqttClient && mqttClient.options && mqttClient.options.clientId,
  });
}
