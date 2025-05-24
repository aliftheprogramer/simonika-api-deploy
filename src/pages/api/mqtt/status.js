import { initializeMqttClient } from '@/lib/mqttClient';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const mqttClient = initializeMqttClient();
  const {
    MQTT_BROKER_HOST,
    MQTT_BROKER_PORT,
    MQTT_SUBSCRIBE_TOPIC = 'devices/wokwi_esp8266/data',
  } = process.env;

  res.status(200).json({
    connected: mqttClient.connected,
    broker_host: MQTT_BROKER_HOST,
    broker_port: parseInt(MQTT_BROKER_PORT),
    subscribed_topic: MQTT_SUBSCRIBE_TOPIC,
    client_id: mqttClient.options.clientId,
  });
}
