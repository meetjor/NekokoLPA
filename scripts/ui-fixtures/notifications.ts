/** QL_UI_FIXTURE_ONLY — injected into the non-published x86_64 build AFTER ARM64 signing. */
import {store} from '@/store';
import {setDeviceState, setInternalDevices} from '@/store/slices';
import {Adapters} from '@/lpa/adapters/registry';
import {preferences} from '@/shared/storage';
import i18n from '@/i18n';

export function prepareNotificationFixture() {
  preferences.set('language', 'zh');
  preferences.set('theme', 'default');
  preferences.set('redactMode', 'none');
  void i18n.changeLanguage('zh');
  const profiles = [
    {iccid: '8910000000000000001', profileName: 'Telna_Jetpac_超长配置名称_Notification_Layout_Test', serviceProviderName: 'Example', profileOwnerMccMnc: '310260', profileState: 1},
    {iccid: '8944000000000000002', profileName: 'giffgaff 测试配置', serviceProviderName: 'Example', profileOwnerMccMnc: '23410', profileState: 0},
  ];
  let notifications = [77, 76, 75, 74].map((seqNumber, index) => ({
    seqNumber, iccid: profiles[Math.floor(index / 2)].iccid,
    notificationAddress: index < 2 ? 'consumer.example.invalid' : 'very.long.operator.notification.server.example.invalid',
    profileManagementOperation: index % 2 ? 0x20 : 0x40,
  }));
  const publish = () => store.dispatch(setDeviceState([{profiles, notifications: [...notifications]}, 'ui-fixture']));
  // No transport, APDU, HTTP, eSIM installation or deletion is available here.
  Adapters['ui-fixture'] = {
    obsolete: false,
    getNotifications: async () => { publish(); return notifications; },
    sendNotification: async () => ({result: -1}),
    deleteNotification: async () => { throw Error('Fixture must not remove an unsent notification'); },
    processNotifications: async () => ({result: -1, total: 4, sent: 0, failed: 4, removed: 0, retained: 4}),
  } as any;
  publish();
  store.dispatch(setInternalDevices([]));
}
