"""Validate the merged release manifest, including permissions contributed by libraries."""
import glob
import xml.etree.ElementTree as ET

files = glob.glob('android/app/build/intermediates/merged_manifests/release/**/AndroidManifest.xml', recursive=True)
assert len(files) == 1, f'Expected one merged release manifest, found {len(files)}'
root = ET.parse(files[0]).getroot()
a = '{http://schemas.android.com/apk/res/android}'
permissions = {node.get(a + 'name'): node for node in root.findall('uses-permission')}
assert 'android.permission.READ_EXTERNAL_STORAGE' not in permissions
for name in ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'BLUETOOTH', 'BLUETOOTH_ADMIN']:
    assert permissions['android.permission.' + name].get(a + 'maxSdkVersion') == '30', name
assert permissions['android.permission.BLUETOOTH_SCAN'].get(a + 'usesPermissionFlags') == 'neverForLocation'
for name in ['READ_PHONE_STATE', 'CAMERA', 'INTERNET', 'BLUETOOTH_CONNECT']:
    assert 'android.permission.' + name in permissions, name
print('Merged release permissions verified: legacy location limited to API 30, no broad storage access')
