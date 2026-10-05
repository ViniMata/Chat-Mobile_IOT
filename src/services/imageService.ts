import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export async function chooseImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Permissão para acessar as fotos foi negada.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
  return result.canceled ? null : result.assets[0]?.uri ?? null;
}

export async function uploadImage(uri: string, folder: 'profiles' | 'groups'): Promise<string> {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) throw new Error('Configure EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME e EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
  const body = new FormData();
  if (Platform.OS === 'web') {
    const file = await (await fetch(uri)).blob();
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) throw new Error('Escolha uma imagem de até 10 MB.');
    body.append('file', file, `${folder}-${Date.now()}`);
  } else {
    const extension = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', avif: 'image/avif' };
    body.append('file', { uri, type: mimeTypes[extension] ?? 'image/jpeg', name: `${folder}-${Date.now()}.${extension}` } as unknown as Blob);
  }
  body.append('upload_preset', uploadPreset); body.append('folder', `connect-chat/${folder}`);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body });
  const payload: unknown = await response.json();
  if (!response.ok || typeof payload !== 'object' || payload === null || typeof (payload as Record<string, unknown>).secure_url !== 'string') throw new Error('Não foi possível enviar a imagem.');
  const url = (payload as Record<string, string>).secure_url;
  if (!url.startsWith('https://')) throw new Error('O armazenamento retornou uma URL de imagem inválida.');
  return url;
}
