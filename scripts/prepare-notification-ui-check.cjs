// Modify only the disposable CI checkout, after the real ARM64 APK is signed/uploaded.
const fs = require('fs');
function replace(path, before, after) {
  const source = fs.readFileSync(path, 'utf8');
  if (source.split(before).length !== 2) throw Error(`Expected one UI injection point in ${path}`);
  fs.writeFileSync(path, source.replace(before, after));
}
replace('src/app/App.tsx', "import {DeviceListener} from '@/lpa/DeviceListener';", "import {prepareNotificationFixture} from '../../scripts/ui-fixtures/notifications';\nprepareNotificationFixture();");
replace('src/app/App.tsx', '<DeviceListener>', '<React.Fragment>');
replace('src/app/App.tsx', '</DeviceListener>', '</React.Fragment>');
replace('src/app/navigation/RootNavigator.tsx', '<NavigationContainer theme={navTheme} ref={navigationRef}>', `<NavigationContainer theme={navTheme} ref={navigationRef} initialState={{index: 1, routes: [{name: 'Main'}, {name: 'Notifications', params: {deviceId: 'ui-fixture'}}]}}>`);
