// src/pages/api/mqtt/status.js
import runMiddleware, { cors } from '@/lib/cors';
import { initializeMqttClient } from '@/lib/mqttClient';

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  const {
    MQTT_BROKER_HOST,
    MQTT_BROKER_PORT,
    MQTT_SUBSCRIBE_TOPIC = 'devices/wokwi_esp8266/data',
  } = process.env;

  const mqttClient = initializeMqttClient();

  res.status(200).json({
    connected: mqttClient.connected,
    broker_host: MQTT_BROKER_HOST,
    broker_port: parseInt(MQTT_BROKER_PORT),
    subscribed_topic: MQTT_SUBSCRIBE_TOPIC,
    client_id: mqttClient.options.clientId,
  });
}
