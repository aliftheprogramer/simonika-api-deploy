import mqtt from 'mqtt';

let mqttClient = null;
let receivedMessages = [];

export function getReceivedMessages() {
  return receivedMessages;
}

export function initializeMqttClient() {
  if (mqttClient) return mqttClient;

  const {
    MQTT_BROKER_HOST,
    MQTT_BROKER_PORT,
    MQTT_USERNAME,
    MQTT_PASSWORD,
    MQTT_SUBSCRIBE_TOPIC = 'devices/wokwi_esp8266/data',
  } = process.env;

  const options = {
    port: parseInt(MQTT_BROKER_PORT),
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    clientId: `nextjs_backend_${Math.random().toString(16).substr(2, 8)}`,
    protocol: 'mqtts',
    reconnectPeriod: 5000,
    clean: true,
  };

  mqttClient = mqtt.connect(`mqtts://${MQTT_BROKER_HOST}`, options);

  mqttClient.on('connect', () => {
    console.log('[MQTT] Connected to broker');
    mqttClient.subscribe(MQTT_SUBSCRIBE_TOPIC, (err) => {
      if (!err) {
        console.log(`[MQTT] Subscribed to ${MQTT_SUBSCRIBE_TOPIC}`);
      }
    });
  });

  mqttClient.on('message', (topic, message) => {
    const payload = message.toString();
    console.log(`[MQTT] Message received from ${topic}: ${payload}`);
    receivedMessages.push({ topic, payload, timestamp: new Date().toISOString() });
    if (receivedMessages.length > 10) receivedMessages.shift();

    if (topic.startsWith('devices/') && topic.endsWith('/data')) {
      try {
        const data = JSON.parse(payload);
        console.log('[MQTT] Parsed device data:', data);
      } catch (e) {
        console.error('[MQTT] Failed to parse JSON:', e);
      }
    }
  });

  mqttClient.on('error', (err) => console.error('[MQTT] Error:', err));
  mqttClient.on('close', () => console.log('[MQTT] Connection closed'));
  mqttClient.on('offline', () => console.log('[MQTT] Offline'));

  return mqttClient;
}
