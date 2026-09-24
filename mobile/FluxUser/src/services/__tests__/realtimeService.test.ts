import AsyncStorage from '@react-native-async-storage/async-storage';

let mockClientConfig: any;
let mockClient: any;

jest.mock('@stomp/stompjs', () => ({
  ReconnectionTimeMode: {EXPONENTIAL: 'EXPONENTIAL'},
  Client: jest.fn().mockImplementation((config: any) => {
    mockClientConfig = config;
    mockClient = {
      activate: jest.fn(),
      deactivate: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
      onConnect: undefined,
      onWebSocketClose: undefined,
      onStompError: undefined,
    };
    return mockClient;
  }),
}));

jest.mock('../../config/env', () => ({SOCKET_URL: 'https://api.flux.test'}));

import {subscribeToBookingRealtime} from '../realtimeService';

describe('booking realtime connection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('access-token');
  });

  it('uses authenticated heartbeats, exponential reconnect and reconciles on connect', async () => {
    const onConnected = jest.fn();
    const onConnectionChange = jest.fn();
    const cleanup = await subscribeToBookingRealtime(42, {onConnected, onConnectionChange});

    expect(mockClientConfig.brokerURL).toBe('wss://api.flux.test/ws-native');
    expect(mockClientConfig.connectHeaders.Authorization).toBe('Bearer access-token');
    expect(mockClientConfig.heartbeatIncoming).toBe(10000);
    expect(mockClientConfig.maxReconnectDelay).toBe(30000);
    expect(mockClientConfig.reconnectTimeMode).toBe('EXPONENTIAL');

    mockClient.onConnect();
    expect(onConnected).toHaveBeenCalledTimes(1);
    expect(onConnectionChange).toHaveBeenLastCalledWith(true);
    expect(mockClient.subscribe).toHaveBeenCalledTimes(2);

    mockClient.onWebSocketClose();
    expect(onConnectionChange).toHaveBeenLastCalledWith(false);
    cleanup();
    expect(mockClient.deactivate).toHaveBeenCalledTimes(1);
  });
});
