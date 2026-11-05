import React from 'react';
import {Platform, ScrollView, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import SafeScreen from '@/shared/ui/SafeScreen';
import Nightscape from '@/shared/ui/Nightscape';
import type {RootScreenProps} from '@/app/navigation/types';
import {Text as TText, XStack, YStack} from 'tamagui';
import {
  Languages,
  Moon,
  Layers,
  EyeOff,
  Activity,
  Subtitles,
  ShieldCheck,
  Fingerprint,
  Palette,
  Image as ImageIcon,
  ChevronLeft,
  RefreshCcw,
  CheckCircle,
} from '@tamagui/lucide-icons';
import {isSimplifiedMode} from '@/shared/config/features';
import {preferences} from '@/shared/storage';
import {useColorScheme, type ThemePreference} from '@/app/providers/ThemeProvider';
import i18next from 'i18next';
import PickerRow from '@/features/settings/components/PickerRow';
import SelectRow from '@/features/settings/components/SelectRow';
import AIDRow from '@/features/settings/components/AIDRow';
import type {SettingRow} from '@/features/settings/types';
import {DEFAULT_THEME_COLOR} from '@/shared/theme/presetColors';
import SectionLabel from '@/shared/ui/SectionLabel';
import RowGroup, {Row} from '@/shared/ui/RowGroup';
import {AppVersion} from '@/shared/config/app';
import {fontFamily, fontSize, radius} from '@/shared/theme/tokens';

/** Which rows belong to which section, in display order. */
const SECTIONS = [
  {titleKey: 'main:settings_group_general', keys: ['language', 'theme', 'showSlots']},
  {
    titleKey: 'main:settings_group_display',
    keys: ['redactMode', 'unit', 'displaySubtitle', 'operatorIcons', 'themeColor'],
  },
  {titleKey: 'main:settings_group_advanced', keys: ['disableProtection', 'aid']},
] as const;

/** Rows hidden when the app is built in simplified mode. */
const SIMPLIFIED_HIDDEN_KEYS = [
  'displaySubtitle',
  'unit',
  'disableProtection',
  'aid',
  'themeColor',
];

const SettingsSection = ({
  title,
  items,
  renderItem,
}: {
  title: string;
  items: SettingRow[];
  renderItem: (props: {item: SettingRow}) => React.ReactNode;
}) => {
  if (items.length === 0) return null;
  // A mono micro-label over a hairline-separated group: the separators come
  // from RowGroup's 1px gaps, so there is no rule under the final row.
  return (
    <YStack gap={10} marginBottom={24}>
      <XStack paddingLeft={4} alignItems="center" gap={9}>
        <YStack
          width={3}
          height={15}
          backgroundColor="$primaryColor"
          borderRadius={radius.pill}
        />
        <SectionLabel>{title}</SectionLabel>
      </XStack>
      <RowGroup>
        {items.map(item => (
          <Row key={item.key} paddingVertical={16}>
            {renderItem({item})}
          </Row>
        ))}
      </RowGroup>
    </YStack>
  );
};

export default function Settings({navigation}: RootScreenProps<'Settings'>) {
  const {t} = useTranslation(['main']);
  const {setTheme} = useColorScheme();

  const keysToHide = isSimplifiedMode() ? SIMPLIFIED_HIDDEN_KEYS : [];

  const allItems: SettingRow[] = [
    {
      key: 'language',
      icon: Languages,
      options: ['en', 'ja', 'ko', 'zh', 'es', 'ru', 'ar'],
      defaultValue: 'en',
      type: 'select',
      onChange: (value: string) => {
        preferences.set('language', value);
        void i18next.changeLanguage(value);
      },
    },
    {
      key: 'theme',
      icon: Moon,
      options: ['default', 'dark', 'light'],
      defaultValue: 'default',
      type: 'select',
      onChange: (value: string) => {
        setTheme(value as ThemePreference);
      },
    },
    {
      key: 'showSlots',
      icon: Layers,
      options: ['all', 'possible', 'available'],
      defaultValue: 'all',
      type: 'select',
    },
    {
      key: 'redactMode',
      icon: EyeOff,
      options: ['none', 'medium', 'hard', 'block'],
      defaultValue: 'none',
      type: 'select',
    },
    {
      key: 'unit',
      icon: Activity,
      options: ['b', 'kb', 'kib', 'mb', 'mib', 'adaptive_si', 'adaptive_bi'],
      defaultValue: 'adaptive_si',
      type: 'select',
    },
    {
      key: 'displaySubtitle',
      icon: Subtitles,
      options: ['provider', 'operator', 'country', 'code', 'iccid'],
      defaultValue: 'provider',
      type: 'select',
    },
    {
      key: 'disableProtection',
      icon: ShieldCheck,
      options: ['on', 'off'],
      defaultValue: 'on',
      type: 'select',
      androidOnly: true,
    },
    {
      key: 'operatorIcons',
      icon: ImageIcon,
      options: ['on', 'off'],
      defaultValue: 'on',
      type: 'select',
    },
    {key: 'aid', icon: Fingerprint, type: 'aid'},
    {key: 'themeColor', icon: Palette, defaultValue: DEFAULT_THEME_COLOR, type: 'color'},
  ];

  const filteredItems = allItems.filter(item => {
    if (keysToHide.includes(item.key)) return false;
    if (item.androidOnly && Platform.OS !== 'android') return false;
    return true;
  });

  const renderItem = ({item}: {item: SettingRow}) => {
    switch (item.type) {
      case 'color':
        return <PickerRow key={item.key} row={item} />;
      case 'select':
        return <SelectRow key={item.key} row={item} />;
      case 'aid':
        return <AIDRow key={item.key} row={item} />;
      default:
        return null;
    }
  };

  return (
    <SafeScreen>
      <YStack flex={1} backgroundColor="#0B1127">
        <XStack alignItems="center" gap={14} paddingHorizontal={18} paddingTop={16} paddingBottom={16}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="返回"
            onPress={() => navigation.goBack()}
            style={{padding: 6}}>
            <ChevronLeft size={27} color="#F4F5FF" />
          </TouchableOpacity>
          <TText color="#F4F5FF" fontSize={25} fontWeight={'700' as any}>
            设置
          </TText>
        </XStack>

        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{flex: 1}}
          contentContainerStyle={{paddingHorizontal: 17, paddingTop: 14, paddingBottom: 150}}>
          {SECTIONS.map(section => (
            <SettingsSection
              key={section.titleKey}
              title={t(section.titleKey)}
              items={filteredItems.filter(i => (section.keys as readonly string[]).includes(i.key))}
              renderItem={renderItem}
            />
          ))}

          <YStack marginBottom={23} gap={11}>
            <XStack alignItems="center" gap={9} paddingHorizontal={5}>
              <YStack width={3} height={15} backgroundColor="#70CAFF" borderRadius={radius.pill} />
              <TText color="#7BD5FF" fontSize={16} fontWeight={'700' as any}>状态同步</TText>
            </XStack>
            <RowGroup>
              <Row paddingVertical={17}>
                <XStack alignItems="center" gap={14}>
                  <RefreshCcw size={23} color="#61CAFF" />
                  <YStack flex={1} gap={4}>
                    <TText fontSize={fontSize.lg} color="#F0F2FF">切换后自动刷新</TText>
                    <TText fontSize={12} color="#A1AFD3">切换成功后再次读取芯片状态</TText>
                  </YStack>
                  <CheckCircle size={22} color="#40E1A1" />
                </XStack>
              </Row>
            </RowGroup>
          </YStack>

          <YStack gap={10} marginBottom={18}>
            <XStack paddingLeft={4} alignItems="center" gap={9}>
              <YStack width={3} height={15} backgroundColor="#70CAFF" borderRadius={radius.pill} />
              <TText color="#7BD5FF" fontSize={16} fontWeight={'700' as any}>
                关于 QianLesim
              </TText>
            </XStack>
            <RowGroup>
              <Row paddingVertical={17}>
                <XStack alignItems="center" justifyContent="space-between" gap={12}>
                  <TText color="#F3F5FF" fontSize={fontSize.lg}>版本</TText>
                  <TText color="#BEC8EE" fontFamily={fontFamily.mono as any} fontSize={fontSize.md}>
                    v{AppVersion} · 定制版
                  </TText>
                </XStack>
              </Row>
              <Row paddingVertical={12}>
                <TText fontSize={12} color="#9AA9CE">
                  基于 NekokoLPA 开源项目 · 三证书兼容版
                </TText>
              </Row>
            </RowGroup>
          </YStack>
        </ScrollView>

        <YStack position="absolute" bottom={0} left={0} right={0} pointerEvents="none" opacity={0.75}>
          <Nightscape height={105} footer />
        </YStack>
      </YStack>
    </SafeScreen>
  );
}
