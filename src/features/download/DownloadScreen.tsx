import {useTranslation} from 'react-i18next';
import {Button, Text} from 'tamagui';
import Screen from '@/shared/ui/Screen';
import type {AuthenticationResult} from '@/lpa/types/commands';
import type {DownloadResult} from '@/lpa/types/operations';
import React, {useState} from 'react';
import type {RootScreenProps} from '@/app/navigation/types';
import {ScannerInitial} from '@/features/download/ScannerInitial';
import {ScannerAuthentication} from '@/features/download/ScannerAuthentication';
import {ScannerResult} from '@/features/download/ScannerResult';
import {View} from 'react-native';

function Scanner({route, navigation}: RootScreenProps<'Scanner'>) {
  const {deviceId, appLink} = route.params;
  const {t} = useTranslation(['main']);

  const [scanState, setScanState] = useState(0);
  const [authenticateResult, setAuthenticateResult] = useState<AuthenticationResult | null>(null);
  const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(null);
  const [confirmationCode, setConfirmationCode] = useState('');

  return (
    <View style={{flex: 1}}>
      {!deviceId && (
        <Screen title={t('main:download_profile')}>
          <Text color="$textDefault">{t('main:no_device')}</Text>
          <Button onPress={() => navigation.goBack()}>{t('main:go_back')}</Button>
        </Screen>
      )}
      {scanState === 0 && deviceId && (
        <ScannerInitial
          appLink={appLink}
          deviceId={deviceId}
          finishAuthenticate={({authenticateResult, confirmationCode}) => {
            setAuthenticateResult(authenticateResult);
            setConfirmationCode(confirmationCode);
            setScanState(1);
          }}
        />
      )}
      {scanState === 1 && deviceId && authenticateResult && (
        <ScannerAuthentication
          deviceId={deviceId}
          initialConfirmationCode={confirmationCode}
          authenticateResult={authenticateResult}
          goBack={() => {
            setScanState(0);
          }}
          confirmDownload={({downloadResult}) => {
            setDownloadResult(downloadResult);
            setScanState(3);
          }}
        />
      )}
      {scanState === 3 && deviceId && authenticateResult?.success && downloadResult && (
        <ScannerResult
          deviceId={deviceId}
          authenticateResult={authenticateResult}
          downloadResult={downloadResult}
          goBack={() => {
            setScanState(0);
            setDownloadResult(null);
            setAuthenticateResult(null);
            navigation.goBack();
          }}
        />
      )}
    </View>
  );
}

export default Scanner;
