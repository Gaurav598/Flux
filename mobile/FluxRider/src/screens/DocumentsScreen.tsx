import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import api from '../config/api';
import {colors} from '../theme';
import CardGradient from '../components/CardGradient';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Info,
  Camera,
  Briefcase,
  Landmark,
} from 'lucide-react-native';

const DocumentsScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<any[]>([]);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  useEffect(() => {
    fetchRiderProfile();
  }, []);

  const fetchRiderProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/rider/profile');
      const rider = response.data;

      setDocs([
        {
          id: 'dl',
          label: 'Driving License',
          status: rider.drivingLicenseUrl ? 'verified' : 'missing',
          icon: Briefcase,
          color: colors.info,
          patchField: 'drivingLicenseUrl',
        },
        {
          id: 'rc',
          label: 'Vehicle RC',
          status: rider.vehicleRcUrl ? 'verified' : 'missing',
          icon: FileText,
          color: colors.accent,
          patchField: 'vehicleRcUrl',
        },
        {
          id: 'aadhar',
          label: 'Government ID Card',
          status: rider.aadharCardUrl ? 'verified' : 'missing',
          icon: Landmark,
          color: colors.success,
          patchField: 'aadharCardUrl',
        },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'verified':
        return {bg: colors.successSoft, text: colors.success, icon: CheckCircle2, label: 'Verified'};
      case 'pending':
        return {bg: 'rgba(245,158,11,0.16)', text: colors.warning, icon: Clock, label: 'In Review'};
      default:
        return {bg: colors.dangerSoft, text: colors.danger, icon: AlertCircle, label: 'Missing'};
    }
  };

  const uploadDocumentFile = async (doc: any, fileAsset: any) => {
    if (!fileAsset?.uri) {
      Alert.alert('Error', 'Failed to read selected file');
      return;
    }

    const fileName =
      fileAsset.fileName ||
      `${doc.id}-${Date.now()}.${(fileAsset.type || 'image/jpeg').split('/')[1] || 'jpg'}`;
    const fileType = fileAsset.type || 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri: fileAsset.uri,
      type: fileType,
      name: fileName,
    } as any);

    setUploadingDocId(doc.id);
    try {
      const uploadResponse = await api.post('/upload/document', formData, {
        headers: {'Content-Type': 'multipart/form-data'},
      });
      const uploadedUrl = uploadResponse.data;
      if (!uploadedUrl || typeof uploadedUrl !== 'string') {
        throw new Error('Upload response missing file URL');
      }

      await api.patch('/rider/documents', {
        [doc.patchField]: uploadedUrl,
      });
      await fetchRiderProfile();
      Alert.alert('Success', `${doc.label} uploaded successfully`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update document');
    } finally {
      setUploadingDocId(null);
    }
  };

  const openPicker = async (doc: any, source: 'camera' | 'gallery') => {
    try {
      const pickerResult =
        source === 'camera'
          ? await launchCamera({
              mediaType: 'photo',
              includeBase64: false,
              saveToPhotos: false,
            })
          : await launchImageLibrary({
              mediaType: 'photo',
              includeBase64: false,
              selectionLimit: 1,
            });

      if (pickerResult.didCancel) {
        return;
      }
      const asset = pickerResult.assets?.[0];
      if (!asset) {
        Alert.alert('Error', 'No file selected');
        return;
      }
      await uploadDocumentFile(doc, asset);
    } catch {
      Alert.alert('Error', 'Failed to open file picker');
    }
  };

  const onSelectDocument = (doc: any) => {
    Alert.alert('Upload Document', `Choose source for ${doc.label}`, [
      {text: 'Camera', onPress: () => openPicker(doc, 'camera')},
      {text: 'Gallery', onPress: () => openPicker(doc, 'gallery')},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading documents...</Text>
      </View>
    );
  }

  const verifiedCount = docs.filter(d => d.status === 'verified').length;
  const totalDocs = docs.length;
  const verificationScore = Math.round((verifiedCount / totalDocs) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Compliance</Text>
          <Text style={styles.headerSubtitle}>Legal & Verification</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressCard}>
          <CardGradient radius={20} />
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Verification Score</Text>
            <Text style={styles.progressValue}>{verificationScore}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, {width: `${verificationScore}%`}]} />
          </View>
          <Text style={styles.progressHint}>
            {verificationScore === 100
              ? 'All documents verified.'
              : `Upload ${totalDocs - verifiedCount} more document${
                  totalDocs - verifiedCount > 1 ? 's' : ''
                } to reach 100%.`}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Required Documents</Text>

        {docs.map(doc => {
          const status = getStatusStyle(doc.status);
          return (
            <TouchableOpacity
              key={doc.id}
              activeOpacity={0.75}
              onPress={() => onSelectDocument(doc)}
              style={styles.docCard}>
              <CardGradient radius={16} />
              <View style={[styles.docIcon, {backgroundColor: `${doc.color}15`}]}>
                <doc.icon size={22} color={doc.color} strokeWidth={2.5} />
              </View>

              <View style={styles.docInfo}>
                <Text style={styles.docLabel}>{doc.label}</Text>
                <View style={[styles.statusBadge, {backgroundColor: status.bg}]}>
                  <status.icon size={10} color={status.text} strokeWidth={3} />
                  <Text style={[styles.statusText, {color: status.text}]}>{status.label}</Text>
                </View>
              </View>

              <View style={styles.uploadBtn}>
                {uploadingDocId === doc.id ? (
                  <ActivityIndicator size="small" color={colors.onAccent} />
                ) : (
                  <Camera size={18} color={colors.onAccent} strokeWidth={2.5} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.helpBox}>
          <CardGradient radius={16} />
          <View style={styles.helpIcon}>
            <Info size={20} color={colors.info} />
          </View>
          <View style={styles.helpTextContainer}>
            <Text style={styles.helpTitle}>Verification Process</Text>
            <Text style={styles.helpSubtitle}>
              Tap any document and upload a clear photo from camera or gallery.
            </Text>
          </View>
        </View>

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg},
  loadingText: {marginTop: 12, fontSize: 14, fontWeight: '600', color: colors.textSub},
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border},
  backBtn: {width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: 15},
  headerTitle: {fontSize: 24, fontWeight: '900', color: colors.text},
  headerSubtitle: {fontSize: 12, fontWeight: '600', color: colors.textMute, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.8},
  content: {flex: 1, paddingHorizontal: 20, paddingTop: 20},
  progressCard: {backgroundColor: 'transparent', overflow: 'hidden', borderRadius: 20, padding: 20, marginBottom: 28},
  progressHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  progressLabel: {fontSize: 13, fontWeight: '700', color: colors.textSub, textTransform: 'uppercase', letterSpacing: 0.8},
  progressValue: {fontSize: 28, fontWeight: '900', color: colors.accent},
  progressBarBg: {height: 8, backgroundColor: colors.surfaceHigh, borderRadius: 4, overflow: 'hidden', marginBottom: 12},
  progressBarFill: {height: '100%', backgroundColor: colors.accent, borderRadius: 4},
  progressHint: {fontSize: 12, color: colors.textSub, lineHeight: 18},
  sectionTitle: {fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 16},
  docCard: {backgroundColor: 'transparent', overflow: 'hidden', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center'},
  docIcon: {width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14},
  docInfo: {flex: 1},
  docLabel: {fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 6},
  statusBadge: {flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4},
  statusText: {fontSize: 10, fontWeight: '800', marginLeft: 4, textTransform: 'uppercase'},
  uploadBtn: {width: 38, height: 38, borderRadius: 10, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center'},
  helpBox: {backgroundColor: 'transparent', overflow: 'hidden', borderRadius: 16, padding: 16, flexDirection: 'row', marginTop: 10},
  helpIcon: {marginRight: 12, marginTop: 1},
  helpTextContainer: {flex: 1},
  helpTitle: {fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 4},
  helpSubtitle: {fontSize: 12, color: colors.textSub, lineHeight: 18},
});

export default DocumentsScreen;
