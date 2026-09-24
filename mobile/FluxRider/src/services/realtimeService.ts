import AsyncStorage from '@react-native-async-storage/async-storage';
import {Client, IMessage, ReconnectionTimeMode} from '@stomp/stompjs';
import {SOCKET_URL} from '../config/env';
import {TOKEN_KEY} from '../constants/storageKeys';

export type BookingRealtimeHandlers = {
  onConnected?: () => void;
  onStatus?: (event: any) => void;
  onLocation?: (event: any) => void;
  onConnectionChange?: (connected: boolean) => void;
};

export const subscribeToBookingRealtime = async (
  bookingId: number,
  handlers: BookingRealtimeHandlers,
): Promise<() => void> => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return () => undefined;

  const seenEventIds = new Set<string>();
  let latestVersion = -1;
  const deliver = (message: IMessage, handler?: (event: any) => void) => {
    try {
      const event = JSON.parse(message.body);
      if (event.eventId && seenEventIds.has(event.eventId)) return;
      if (event.eventId) {
        seenEventIds.add(event.eventId);
        if (seenEventIds.size > 100) seenEventIds.delete(seenEventIds.values().next().value);
      }
      if (typeof event.version === 'number' && event.version < latestVersion) return;
      if (typeof event.version === 'number') latestVersion = event.version;
      handler?.(event);
    } catch (error) {
      if (__DEV__) console.warn('Invalid realtime event', error);
    }
  };

  const wsBase = SOCKET_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  const client = new Client({
    brokerURL: `${wsBase}/ws-native`,
    connectHeaders: {Authorization: `Bearer ${token}`},
    heartbeatIncoming: 10_000,
    heartbeatOutgoing: 10_000,
    reconnectDelay: 1_000 + Math.floor(Math.random() * 500),
    maxReconnectDelay: 30_000,
    reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
    connectionTimeout: 10_000,
    debug: message => {
      if (__DEV__) console.debug(`[stomp] ${message}`);
    },
  });

  client.onConnect = () => {
    handlers.onConnectionChange?.(true);
    client.subscribe(`/topic/booking/${bookingId}/status`, message =>
      deliver(message, handlers.onStatus),
    );
    client.subscribe(`/topic/booking/${bookingId}/location`, message =>
      deliver(message, handlers.onLocation),
    );
    handlers.onConnected?.();
  };
  client.onWebSocketClose = () => handlers.onConnectionChange?.(false);
  client.onStompError = () => handlers.onConnectionChange?.(false);
  client.activate();

  return () => {
    handlers.onConnectionChange?.(false);
    void client.deactivate();
  };
};
