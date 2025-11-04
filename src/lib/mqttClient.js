import mqtt from 'mqtt';

let mqttClient = null;
let receivedMessages = [];
const messageListeners = new Set();
// current subscription topic (can be changed at runtime via API)
// let currentSubscribeTopic = process.env.MQTT_SUBSCRIBE_TOPIC || 'devices/+/data';
let currentSubscribeTopic = 'devices/00e5b570/data';


export function initializeMqttClient() {
  if (mqttClient) return mqttClient;

  const {
    MQTT_BROKER_HOST,
    MQTT_BROKER_PORT,
    MQTT_USERNAME,
    MQTT_PASSWORD,
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

  // Normalize broker host and allow full URL formats
  let brokerHost = MQTT_BROKER_HOST || '';

  // If user provided a URL with a scheme (http://, mqtt://, mqtts://, ws://, etc), use it as-is
  const hasScheme = /^(wss?:|mqtts?:)\/\//i.test(brokerHost);
  if (!hasScheme) {
    // strip any accidental protocol (e.g. http://) and trailing slashes
    brokerHost = brokerHost.replace(/^.*?:\/\//, '').replace(/\/$/, '');
  }

  const url = hasScheme
    ? brokerHost
    : `${options.protocol}://${brokerHost}${MQTT_BROKER_PORT ? `:${MQTT_BROKER_PORT}` : ''}`;

  console.log(`[MQTT] Connecting to broker URL: ${url}`);
  mqttClient = mqtt.connect(url, options);

  mqttClient.on('connect', () => {
    console.log('[MQTT] Connected to broker');
    mqttClient.subscribe(currentSubscribeTopic, (err) => {
      if (!err) {
        console.log(`[MQTT] Subscribed to ${currentSubscribeTopic}`);
      }
    });
  });

  mqttClient.on('message', (topic, message) => {
    const payload = message.toString();
    console.log(`[MQTT] Message received from ${topic}: ${payload}`);
    const record = { topic, payload, timestamp: new Date().toISOString() };
    receivedMessages.push(record);
    if (receivedMessages.length > 10) receivedMessages.shift();

    if (topic.startsWith('devices/') && topic.endsWith('/data')) {
      try {
        const data = JSON.parse(payload);
        console.log('[MQTT] Parsed device data:', data);
      } catch (e) {
        console.error('[MQTT] Failed to parse JSON:', e);
      }
    }

    // Notify listeners (e.g., WebSocket broadcaster)
    for (const cb of messageListeners) {
      try {
        cb(record);
      } catch (e) {
        console.warn('[MQTT] listener callback error:', e?.message || e);
      }
    }
  });

  mqttClient.on('error', (err) => console.error('[MQTT] Error:', err));
  mqttClient.on('close', () => console.log('[MQTT] Connection closed'));
  mqttClient.on('offline', () => console.log('[MQTT] Offline'));

  return mqttClient;
}

// Get the current subscription topic
export function getCurrentSubscribeTopic() {
  return currentSubscribeTopic;
}

// Change subscription topic at runtime. Returns a promise that resolves when subscribe completes.
export function setSubscribeTopic(newTopic) {
  if (!newTopic || typeof newTopic !== 'string') {
    throw new Error('newTopic must be a non-empty string');
  }

  const oldTopic = currentSubscribeTopic;
  currentSubscribeTopic = newTopic;

  if (!mqttClient) {
    // mqtt client not initialized yet; when initialized it will subscribe to currentSubscribeTopic
    return Promise.resolve({ oldTopic, newTopic });
  }

  return new Promise((resolve, reject) => {
    // unsubscribe from old topic first (best-effort)
    mqttClient.unsubscribe(oldTopic, (unsubErr) => {
      if (unsubErr) console.warn('[MQTT] Unsubscribe error for', oldTopic, unsubErr.message || unsubErr);

      // subscribe to new topic
      mqttClient.subscribe(newTopic, (subErr) => {
        if (subErr) {
          console.error('[MQTT] Failed to subscribe to', newTopic, subErr.message || subErr);
          return reject(subErr);
        }
        console.log('[MQTT] Subscribed to', newTopic);
        return resolve({ oldTopic, newTopic });
      });
    });
  });
}

// Return recent messages, optionally filtered by deviceId (from topic or payload) and limited
export function getReceivedMessages(filter = {}) {
  const { deviceId, limit } = filter || {};
  let msgs = receivedMessages.slice();

  if (deviceId) {
    msgs = msgs.filter((m) => {
      // check topic pattern: devices/{deviceId}/data
      const tmatch = m.topic && m.topic.match(/^devices\/([^/]+)\/data$/);
      if (tmatch && tmatch[1] === deviceId) return true;

      // fallback: try to parse payload and match deviceId field inside payload
      try {
        const obj = JSON.parse(m.payload);
        if (obj && (obj.deviceId === deviceId || obj.id === deviceId)) return true;
      } catch (e) {
        // not JSON or no deviceId in payload
      }

      return false;
    });
  }

  if (limit && Number.isInteger(limit) && limit > 0) {
    return msgs.slice(-limit);
  }

  return msgs;
}

// Allow other modules (like WebSocket route) to listen for new messages
export function onMqttMessage(listener) {
  if (typeof listener !== 'function') return () => {};
  messageListeners.add(listener);
  return () => messageListeners.delete(listener);
}
