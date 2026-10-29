import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Camera, Mic, Send } from 'lucide-react-native';
import { MemberProfile, ParsedLineItem } from '../types/ledger';
import { parseMultimodalExpense } from '../lib/gemini';
import { COLORS, MONO_FONT } from '../theme';

export interface DraftExpense {
  title: string;
  paidById: string;
  items: ParsedLineItem[];
  taxAndTip: number;
  note: string;
}

interface CommandBarProps {
  members: MemberProfile[];
  onDraftCreated: (draft: DraftExpense) => void;
  onError: (msg: string) => void;
}

export default function CommandBar({ members, onDraftCreated, onError }: CommandBarProps) {
  const [promptText, setPromptText] = React.useState('');
  const [isProcessingAI, setIsProcessingAI] = React.useState(false);
  const [recording, setRecording] = React.useState<Audio.Recording | null>(null);
  const [webRecording, setWebRecording] = React.useState<any | null>(null);
  const webMediaRecorderRef = React.useRef<any>(null);
  const webAudioChunksRef = React.useRef<Blob[]>([]);

  async function runAIPipeline(payload: {
    textPrompt?: string;
    base64Media?: string;
    mimeType?: 'image/jpeg' | 'image/png' | 'audio/m4a' | 'audio/webm';
  }) {
    if (members.length === 0) {
      onError('Please add group members in the Members tab before parsing expenses.');
      return;
    }

    try {
      setIsProcessingAI(true);

      const extracted = await parseMultimodalExpense({
        members,
        ...payload,
      });

      const matchedPayer =
        members.find(
          (m) =>
            extracted.paidByMemberName &&
            m.name.toLowerCase() === extracted.paidByMemberName.toLowerCase()
        ) || members[0];

      const mappedItems: ParsedLineItem[] = extracted.items.map((item, idx) => {
        const excludedIds = members
          .filter((m) =>
            item.excludedMemberNames.some(
              (ex) => ex.toLowerCase() === m.name.toLowerCase()
            )
          )
          .map((m) => m.id);

        return {
          id: `item-${idx}-${Date.now()}`,
          name: item.name,
          amount: item.amount,
          category: item.category,
          excludedMemberIds: excludedIds,
        };
      });

      onDraftCreated({
        title: extracted.merchantOrTitle || 'Group Expense',
        paidById: matchedPayer?.id || members[0]?.id || '',
        items: mappedItems,
        taxAndTip: extracted.taxAndServiceCharge || 0,
        note: extracted.confidenceNote,
      });
      setPromptText('');
    } catch (err: any) {
      onError(err?.message || 'Failed to parse input.');
    } finally {
      setIsProcessingAI(false);
    }
  }

  async function handlePickReceipt() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].base64) {
      await runAIPipeline({
        base64Media: result.assets[0].base64,
        mimeType: 'image/jpeg',
        textPrompt: promptText || 'Parse this restaurant receipt into categories.',
      });
    }
  }

  async function toggleVoiceRecording() {
    if (Platform.OS === 'web') {
      // Browser MediaRecorder API
      if (webRecording) {
        if (webMediaRecorderRef.current && webMediaRecorderRef.current.state !== 'inactive') {
          webMediaRecorderRef.current.stop();
        }
        setWebRecording(false);
      } else {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            webAudioChunksRef.current = [];
            const recorder = new (window as any).MediaRecorder(stream);
            webMediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e: any) => {
              if (e.data.size > 0) webAudioChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
              const audioBlob = new Blob(webAudioChunksRef.current, { type: 'audio/webm' });
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = () => {
                const base64 = (reader.result as string)?.split(',')[1];
                if (base64) {
                  runAIPipeline({
                    base64Media: base64,
                    mimeType: 'audio/webm',
                  });
                }
              };
              stream.getTracks().forEach((track) => track.stop());
            };

            recorder.start();
            setWebRecording(true);
          } catch (err) {
            onError('Microphone permission denied or unsupported in this browser.');
          }
        } else {
          onError('Audio recording not supported in this browser.');
        }
      }
      return;
    }

    // Native Mobile Recording (Expo AV)
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await runAIPipeline({
          base64Media: base64Audio,
          mimeType: 'audio/m4a',
        });
      }
    } else {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: newRec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRec);
    }
  }

  const isRecording = Boolean(recording || webRecording);

  return (
    <View style={styles.commandBarWrap}>
      <View style={styles.commandBarInner}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handlePickReceipt}
          disabled={isProcessingAI}
        >
          <Camera size={18} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconBtn, isRecording && styles.recordingActive]}
          onPress={toggleVoiceRecording}
          disabled={isProcessingAI}
        >
          <Mic size={18} color={isRecording ? COLORS.bg : COLORS.text} />
        </TouchableOpacity>

        <TextInput
          style={styles.promptInput}
          placeholder='Ask SettleMint: "Rahul paid 3400, 1400 beer..."'
          placeholderTextColor={COLORS.textDim}
          value={promptText}
          onChangeText={setPromptText}
          onSubmitEditing={() => {
            if (promptText.trim()) runAIPipeline({ textPrompt: promptText });
          }}
        />

        <TouchableOpacity
          style={[styles.sendBtn, !promptText.trim() && { opacity: 0.5 }]}
          disabled={isProcessingAI || !promptText.trim()}
          onPress={() => runAIPipeline({ textPrompt: promptText })}
        >
          {isProcessingAI ? (
            <ActivityIndicator size="small" color={COLORS.bg} />
          ) : (
            <Send size={16} color={COLORS.bg} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  commandBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  commandBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingActive: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  promptInput: {
    flex: 1,
    height: 42,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 13,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
