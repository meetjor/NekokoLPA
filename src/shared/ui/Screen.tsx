import React, {PropsWithChildren, ReactNode} from 'react';
import {TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ChevronLeft} from '@tamagui/lucide-icons';
import {Text as TText, useTheme, XStack} from 'tamagui';
import {useTranslation} from 'react-i18next';

import SafeScreen from '@/shared/ui/SafeScreen';
import PageContainer from '@/shared/ui/PageContainer';
import {fontSize, iconSize} from '@/shared/theme/tokens';

type ScreenProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  horizontalPadding?: number;
  keyboardAvoiding?: boolean;
  scrollViewProps?: any;
  fixedHeader?: ReactNode;
  /** Hides the back affordance on a screen that is a navigator root. */
  hideBack?: boolean;
}>;

export default function Screen({
  title,
  subtitle,
  horizontalPadding,
  keyboardAvoiding,
  scrollViewProps,
  fixedHeader,
  hideBack = false,
  children,
}: ScreenProps) {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const {t} = useTranslation(['main']);

  // Every pushed screen gets a back affordance from here rather than each
  // screen adding its own: on Android the hardware button made the omission
  // survivable, but on iOS and Catalyst a screen with no visible way back is a
  // dead end. `canGoBack` keeps it off navigator roots.
  const canGoBack = !hideBack && navigation.canGoBack?.();

  return (
    <SafeScreen>
      <XStack alignItems="center" gap={8} paddingHorizontal={12} paddingTop={8} paddingBottom={16}>
        {canGoBack && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('main:back')}
            onPress={() => navigation.goBack()}
            style={{width: 48, height: 48, alignItems: 'center', justifyContent: 'center'}}>
            <ChevronLeft size={iconSize.md} color={theme.textDefault?.val as string} />
          </TouchableOpacity>
        )}
        {title && (
          <TText flex={1} color="$textDefault" fontSize={24} fontWeight="700">
            {title}
          </TText>
        )}
      </XStack>
      {subtitle ? (
        <TText paddingHorizontal={20} paddingBottom={16} color="$color6" fontSize={fontSize.sm}>
          {subtitle}
        </TText>
      ) : null}
      {fixedHeader}
      <PageContainer
        horizontalPadding={horizontalPadding}
        keyboardAvoiding={keyboardAvoiding}
        scrollViewProps={scrollViewProps}
        topPadding={0}>
        <>{children}</>
      </PageContainer>
    </SafeScreen>
  );
}
