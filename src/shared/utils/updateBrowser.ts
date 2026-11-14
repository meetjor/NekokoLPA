import {Linking, Platform} from 'react-native';
import NativeNekokoLPA from '@/lpa/bridge/specs/NativeNekokoLPA';

export async function openUpdateBrowser(url: string): Promise<void> {
  if (Platform.OS === 'android') {
    if (!NativeNekokoLPA) throw Error('Browser bridge unavailable');
    await NativeNekokoLPA.openUpdateBrowser(url);
  } else {
    await Linking.openURL(url);
  }
}
