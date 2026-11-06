import {parseMetadata} from '@/shared/utils/parser';
import {findPhoneNumbersInText} from 'libphonenumber-js/min';
import {toggleProfile} from '@/shared/utils/profileActions';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import {Text, useTheme, XStack, YStack} from 'tamagui';
// useTheme covers dynamic color; no need for useColorScheme here
import {Pencil, Trash2, Smartphone} from '@tamagui/lucide-icons';
import {Alert, Image, Pressable, TouchableOpacity} from 'react-native';
import {makeLoading} from '@/shared/utils/loading';
import {Flags} from '@/assets/flags';
import React, {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {Profile} from '@/lpa/types/profile';
import {Adapters} from '@/lpa/adapters/registry';
import {useLoading} from '@/app/providers/LoadingProvider';

import {isSimplifiedMode} from '@/shared/config/features';
import {fontSize, radius} from '@/shared/theme/tokens';
import Toggle from '@/shared/ui/Toggle';
import {group, isRedactMode, maskIccid, maskText, maskProfileText, RedactMode} from '@/shared/utils/redact';
import {usePreference} from '@/shared/hooks/usePreference';
import {profileIconUri} from '@/shared/utils/profileIcon';
import {useOperatorIcon} from '@/shared/hooks/useOperatorIcon';

interface ProfileExt extends Profile {
  selected: boolean;
}

// Extracted components
const ProfileTags = React.memo(({tags, stealthMode}: {tags: any[]; stealthMode: string}) => (
  <XStack gap={5} marginVertical={2}>
    {tags.map((t, i) => (
      <XStack
        key={i}
        paddingHorizontal={5}
        borderRadius={radius.xs}
        backgroundColor={t.backgroundColor}>
        <Text fontSize={fontSize.xs} fontWeight={'500' as any} color={t.color}>
          {stealthMode === 'none' ? t.value : stealthMode === 'medium' ? maskProfileText(t.value, 'medium') : '***'}
        </Text>
      </XStack>
    ))}
  </XStack>
));

const ProfileSubtitle = React.memo(
  ({
    metadata,
    mccMnc,
    displaySubtitle,
    stealthMode,
  }: {
    metadata: any;
    mccMnc: any;
    displaySubtitle: string;
    stealthMode: RedactMode;
  }) => {
    const subtitleText = useMemo(() => {
      switch (displaySubtitle) {
        case 'provider':
          return `${metadata?.serviceProviderName} / ${metadata?.profileName}`;
        case 'operator':
          return `[${mccMnc.ISO}] ${mccMnc.Operator}`;
        case 'code':
          return `[${mccMnc.ISO}] ${mccMnc.PLMN} ${mccMnc.TADIG}`;
        case 'country':
          return `[${mccMnc.ISO}] ${mccMnc.Country}`;
        case 'iccid':
          return `ICCID: ${group(maskIccid(metadata.iccid, stealthMode))}`;
        default:
          return `${metadata?.serviceProviderName} / ${metadata?.profileName}`;
      }
    }, [metadata, mccMnc, displaySubtitle, stealthMode]);

    // Theme-aware; no direct Appearance usage needed

    return (
      <Text color="$color6" numberOfLines={1} fontSize={fontSize.sm}>
        {maskProfileText(subtitleText, stealthMode)}
      </Text>
    );
  },
);

const ProfileRowComponent = ({
  profile,
  deviceId,
  syncing = false,
  syncError = false,
}: {
  profile: ProfileExt;
  deviceId: string;
  syncing?: boolean;
  syncError?: boolean;
}) => {
  const {t} = useTranslation(['main']);
  const adapter = Adapters[deviceId];
  const {setLoading, isLoading} = useLoading();
  const navigation = useNavigation<any>();
  const theme = useTheme();

  const storedRedact = usePreference('redactMode', 'none');
  const stealthMode: RedactMode = isRedactMode(storedRedact) ? storedRedact : 'none';
  const isSimplified = isSimplifiedMode();

  const storedSubtitle = usePreference('displaySubtitle', 'provider');
  const displaySubtitle = isSimplified ? 'provider' : storedSubtitle;

  const {tags, name, country, mccMnc} = useMemo(() => parseMetadata(profile, t), [profile, t]);

  // The card's own icon wins where there is one, but most cards ship none —
  // then the operator's PLMN is all there is to go on, and the catalog turns
  // that into a logo.
  const operatorIconUri = useOperatorIcon((profile as any).profileOwnerMccMnc);
  const cardIconUri = useMemo(
    () => profileIconUri((profile as any).icon, (profile as any).iconType),
    [profile],
  );
  const iconUri = cardIconUri ?? operatorIconUri;

  const replacedName = useMemo(() => {
    if (!name) return '';
    const phoneNumbers = findPhoneNumbersInText(name, country as any);
    let result = name;
    for (const p of phoneNumbers) {
      if (p.startsAt >= 0 && p.endsAt <= name.length) {
        const match = name.substring(p.startsAt, p.endsAt);
        if (match[0] !== '+') continue;
        const formatted = p.number.formatInternational();
        if (stealthMode === 'medium') {
          const ccPrefix = `+${p.number.countryCallingCode} `;
          const toReplace =
            formatted.length > ccPrefix.length ? formatted.substring(ccPrefix.length) : '';
          result = result.split(match).join(ccPrefix + toReplace.replace(/\d/g, '*')); // Using split/join as replaceAll polyfill
        } else {
          result = result.split(match).join(formatted);
        }
      }
    }
    return result;
  }, [name, country, stealthMode]);

  const handleProfilePress = useCallback(() => {
    navigation.navigate('Profile', {iccid: profile.iccid, metadata: profile, deviceId});
  }, [navigation, profile, deviceId]);

  const handleDeletePress = useCallback(() => {
    Alert.alert(t('main:profile_delete_profile'), t('main:profile_delete_profile_alert_body'), [
      {text: t('main:profile_delete_tag_cancel'), style: 'cancel'},
      {
        text: t('main:profile_delete_tag_ok'),
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            t('main:profile_delete_profile_alert2'),
            t('main:profile_delete_profile_alert2_body'),
            [
              {
                text: t('main:profile_delete_tag_ok'),
                style: 'destructive',
                onPress: () => {
                  makeLoading(setLoading, async () => {
                    setLoading('Deleting Profile');
                    await adapter.deleteProfileByIccId(profile.iccid);
                    setLoading('Loading Notifications');
                    await adapter.processNotifications(profile.iccid);
                    setLoading(false);
                  });
                },
              },
              {text: t('main:profile_delete_tag_cancel'), style: 'cancel'},
            ],
          );
        },
      },
    ]);
  }, [t, setLoading, adapter, profile.iccid]);

  const handleSwitchChange = useCallback(async () => {
    await makeLoading(setLoading, () => toggleProfile(adapter, profile.iccid, profile.selected));
  }, [profile.selected, adapter, profile.iccid, setLoading]);

  const displayName = useMemo(() => {
    const name_ =
      stealthMode === 'none' || stealthMode === 'medium'
        ? replacedName
        : profile?.serviceProviderName;
    return maskProfileText(maskText(name_, stealthMode), stealthMode);
  }, [stealthMode, replacedName, profile?.serviceProviderName]);

  const renderRightActions = useCallback(() => {
    if (profile.selected) return null;
    return (
      <TouchableOpacity
        onPress={handleDeletePress}
        activeOpacity={0.8}
        style={{
          width: 60,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.backgroundDangerHeavy?.val,
          borderTopRightRadius: 12,
          borderBottomRightRadius: 12,
        }}>
        <Trash2 size={18} color={theme.onFilled?.val} />
      </TouchableOpacity>
    );
  }, [handleDeletePress, profile.selected, theme.backgroundDangerHeavy?.val, theme.onFilled?.val]);

  const renderLeftActions = useCallback(
    () => (
      <TouchableOpacity
        onPress={handleProfilePress}
        activeOpacity={0.8}
        style={{
          width: 60,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.backgroundSuccessLight?.val,
          borderTopLeftRadius: 12,
          borderBottomLeftRadius: 12,
        }}>
        <Pencil size={18} color={theme.onFilled?.val} />
      </TouchableOpacity>
    ),
    [handleProfilePress, theme.backgroundSuccessLight?.val, theme.onFilled?.val],
  );

  if (!adapter || adapter.obsolete) return null;

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootFriction={8}
      friction={2}
      containerStyle={{backgroundColor: theme.surfaceRow?.val}}>
      <YStack backgroundColor="$surfaceRow" paddingHorizontal={14} paddingVertical={15}>
        {profile.selected && (
          <YStack
            position="absolute"
            left={0}
            top={0}
            bottom={0}
            width={3}
            backgroundColor="$primaryColor"
          />
        )}
        <XStack width="100%" alignItems="center" gap={10}>
          <YStack
            width={40}
            height={40}
            borderRadius={radius.md}
            backgroundColor="$surfaceSpecial"
            alignItems="center"
            justifyContent="center"
            overflow="hidden">
            {iconUri ? (
              <Image style={{width: 36, height: 36}} source={{uri: iconUri}} resizeMode="contain" />
            ) : (
              <Smartphone size={22} color={theme.primaryColor?.val as string} />
            )}
          </YStack>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={displayName}
            style={{flex: 1, minWidth: 0}}
            onPress={handleProfilePress}>
            <YStack gap={1}>
              <XStack alignItems="center" gap={8}>
                <Image
                  style={{width: 22, height: 15, borderRadius: 2}}
                  source={Flags[country] || Flags.UN}
                />
                <Text
                  color="$textDefault"
                  fontSize={fontSize.lg}
                  fontWeight={'600' as any}
                  numberOfLines={1}
                  flexShrink={1}>
                  {displayName}
                </Text>
              </XStack>
              <ProfileSubtitle
                metadata={profile}
                mccMnc={mccMnc}
                displaySubtitle={displaySubtitle}
                stealthMode={stealthMode}
              />
              <XStack alignItems="center" gap={7} paddingTop={5}>
                <YStack
                  width={8}
                  height={8}
                  borderRadius={radius.pill}
                  backgroundColor={
                    syncError || syncing
                      ? '$statusWarning'
                      : profile.selected
                      ? '$backgroundSuccess'
                      : '$color9'
                  }
                />
                <Text
                  fontSize={fontSize.xs}
                  fontWeight={'600' as any}
                  color={
                    syncError || syncing
                      ? '$statusWarning'
                      : profile.selected
                      ? '$backgroundSuccess'
                      : '$color6'
                  }>
                  {syncError
                    ? t('main:ui_sync_unknown')
                    : syncing
                    ? t('main:ui_sync_pending')
                    : t(profile.selected ? 'main:ui_enabled' : 'main:ui_disabled')}
                </Text>
              </XStack>
              <ProfileTags tags={tags} stealthMode={stealthMode} />
            </YStack>
          </Pressable>

          <Toggle
            label={`${displayName} · ${t('main:profile_state')}`}
            value={profile.selected}
            disabled={isLoading}
            onPress={handleSwitchChange}
          />
        </XStack>
      </YStack>
    </Swipeable>
  );
};

export const ProfileRow = React.memo(ProfileRowComponent);
