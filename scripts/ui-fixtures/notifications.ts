/** QL_UI_FIXTURE_ONLY — injected into the non-published x86_64 build AFTER ARM64 signing. */
import {store} from '@/store';
import {setDeviceState, setInternalDevices} from '@/store/slices';
import {Adapters} from '@/lpa/adapters/registry';
import {preferences} from '@/shared/storage';
import i18n from '@/i18n';

export function prepareNotificationFixture() {
  preferences.set('automaticAppUpdates', 'off');
  preferences.set('operatorIcons', 'off');
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
  const publish = () => store.dispatch(setDeviceState([{profiles, notifications: [...notifications], available: true,
    eid: '89000000000000000000000000000000'}, 'ui-fixture']));
  // No transport, APDU, HTTP, eSIM installation or deletion is available here.
  Adapters['ui-fixture'] = {
    obsolete: false,
    device: {available: true, displayName: 'SIM 测试', type: 'fixture'},
    refresh: async () => { publish(); },
    getNotifications: async () => { publish(); return notifications; },
    sendNotification: async () => ({result: -1}),
    deleteNotification: async () => { throw Error('Fixture must not remove an unsent notification'); },
    processNotifications: async () => ({result: -1, total: 4, sent: 0, failed: 4, removed: 0, retained: 4}),
  } as any;
  publish();
  store.dispatch(setInternalDevices(['ui-fixture']));
  // Deterministic update UI: first request fails, the second has a new release.
  // Intercept only this endpoint; no actual download/install is performed.
  const originalFetch = global.fetch;
  let checks = 0;
  global.fetch = (async (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    if (url === 'https://api.github.com/repos/meetjor/NekokoLPA/releases?per_page=100') {
      checks++;
      return {ok: checks > 1, json: async () => [{
        tag_name: 'v9.9.9-qianlesim-3sign', draft: false, prerelease: true, published_at: '2026-11-13',
        body: 'UI 测试更新说明：仅为合成数据，不下载、不安装。',
        assets: [{name: 'QianLesim-v9.9.9-arm64.apk', state: 'uploaded', size: 1,
          browser_download_url: 'https://github.com/meetjor/NekokoLPA/releases/download/v9.9.9-qianlesim-3sign/QianLesim-v9.9.9-arm64.apk'}],
      }]} as Response;
    }
    return originalFetch(url, init);
  }) as typeof fetch;
}
