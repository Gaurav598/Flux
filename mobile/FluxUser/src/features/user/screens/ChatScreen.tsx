import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import {ArrowLeft, Send, Phone, User} from 'lucide-react-native';
import api from '../../../config/api';
import {colors} from '../../../theme';

type ChatMessage = {
  id: string;
  sender: 'user' | 'rider';
  text: string;
  time: string;
};

const ChatScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const {riderName, rideId} = route.params || {
    riderName: 'Rider',
    rideId: null,
  };

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const scrollViewRef = useRef<any>();

  const mapMessage = (m: any): ChatMessage => ({
    id: String(m.id),
    sender: m.fromMe ? 'user' : 'rider',
    text: m.message || '',
    time: m.createdAt
      ? new Date(m.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '',
  });

  const loadMessages = async (silent = false) => {
    if (!rideId) {
      setLoading(false);
      return;
    }
    if (!silent) {
      setLoading(true);
    }
    try {
      const response = await api.get(`/chat/booking/${rideId}`);
      const list = Array.isArray(response.data) ? response.data : [];
      setMessages(list.map(mapMessage));
    } catch {
      // ignore transient failures
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(() => loadMessages(true), 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  const sendMessage = async () => {
    const text = message.trim();
    if (!text || !rideId || sending) {
      return;
    }
    setSending(true);
    try {
      await api.post(`/chat/booking/${rideId}`, {message: text});
      setMessage('');
      await loadMessages(true);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({animated: true});
      }, 80);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{backgroundColor: colors.bg}}>
      <View
        className="px-6 py-4 flex-row items-center justify-between border-b"
        style={{borderColor: colors.border, backgroundColor: colors.surface}}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View className="relative">
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{backgroundColor: colors.surfaceAlt}}>
              <User size={24} color={colors.textMute} />
            </View>
          </View>
          <View className="ml-3">
            <Text className="text-base font-black" style={{color: colors.text}}>
              {riderName}
            </Text>
            <Text
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{color: colors.textMute}}>
              Ride Chat
            </Text>
          </View>
        </View>
        <TouchableOpacity
          className="p-2.5 rounded-xl border"
          style={{backgroundColor: colors.surfaceAlt, borderColor: colors.border}}>
          <Phone size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({animated: true})
        }>
        {loading ? (
          <View className="mt-12 items-center">
            <ActivityIndicator size="small" color={colors.accent} />
            <Text className="text-xs font-bold mt-3" style={{color: colors.textMute}}>
              Loading chat...
            </Text>
          </View>
        ) : null}

        {!loading && messages.length === 0 && (
          <View className="mt-8 items-center">
            <Text
              className="text-xs font-bold uppercase tracking-widest"
              style={{color: colors.textMute}}>
              No messages yet
            </Text>
            <Text
              className="text-sm font-semibold mt-2 text-center"
              style={{color: colors.textSub}}>
              Start chat with your rider
            </Text>
          </View>
        )}

        {messages.map(msg => (
          <View
            key={msg.id}
            className={`mb-6 max-w-[80%] ${
              msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
            }`}>
            <View
              className={`px-5 py-4 rounded-[24px] ${
                msg.sender === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'
              }`}
              style={{
                backgroundColor:
                  msg.sender === 'user' ? colors.accent : colors.surfaceAlt,
              }}>
              <Text
                className="text-sm font-bold leading-5"
                style={{
                  color: msg.sender === 'user' ? colors.onAccent : colors.text,
                }}>
                {msg.text}
              </Text>
            </View>
            <Text
              className="text-[10px] font-bold mt-2 uppercase tracking-tighter"
              style={{color: colors.textMute}}>
              {msg.time}
            </Text>
          </View>
        ))}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View
          className="p-6 border-t flex-row items-center"
          style={{backgroundColor: colors.surface, borderColor: colors.border}}>
          <View
            className="flex-1 flex-row items-center rounded-[32px] px-6 py-2 border"
            style={{backgroundColor: colors.surfaceAlt, borderColor: colors.border}}>
            <TextInput
              className="flex-1 py-3 font-bold text-base"
              style={{color: colors.text}}
              placeholder="Message your rider..."
              placeholderTextColor={colors.textMute}
              value={message}
              onChangeText={setMessage}
              multiline
            />
          </View>
          <TouchableOpacity
            onPress={sendMessage}
            disabled={sending}
            className="ml-4 w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-black/20"
            style={{backgroundColor: colors.accent}}>
            {sending ? (
              <ActivityIndicator size="small" color={colors.onAccent} />
            ) : (
              <Send size={20} color={colors.onAccent} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;
