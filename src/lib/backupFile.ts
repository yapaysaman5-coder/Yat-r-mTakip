import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Writes the backup to a temporary file and opens the phone's share menu (Drive, e-posta…). */
export async function shareBackupFile(name: string, text: string): Promise<void> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(text);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Paylaşım bu cihazda kullanılamıyor.');
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Yedeği kaydet veya gönder',
    UTI: 'public.json',
  });
}

/** Lets the person pick a backup file; null when cancelled. */
export async function pickBackupFile(): Promise<{ name: string; text: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return { name: asset.name, text: await new File(asset.uri).text() };
}
