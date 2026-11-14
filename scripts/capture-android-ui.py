#!/usr/bin/env python3
"""Capture Android UI; optional synthetic notification fixture never touches a real card."""
import re
import os
import sys
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path(os.environ.get('QL_UI_OUTPUT', 'dist/ui'))
OUT.mkdir(parents=True, exist_ok=True)
PACKAGE = 'ee.nekoko.nlpa1'
FIXTURE = '--notification-fixture' in sys.argv

def adb(*args):
    return subprocess.check_output(['adb', *args], timeout=30)

def hierarchy():
    adb('shell', 'uiautomator', 'dump', '/sdcard/qianlesim-window.xml')
    return adb('shell', 'cat', '/sdcard/qianlesim-window.xml').decode()

def await_text(text):
    for _ in range(20):
        xml = hierarchy()
        # Android may expose textTransform labels in uppercase.
        if text.casefold() in xml.casefold():
            return xml
        time.sleep(1)
    raise RuntimeError(f'UI did not display {text!r}')

def screenshot(name):
    time.sleep(1)
    (OUT / f'{name}.png').write_bytes(adb('exec-out', 'screencap', '-p'))
    (OUT / f'{name}.xml').write_text(hierarchy())

def open_settings():
    root = ET.fromstring(await_text('QianLesim'))
    for node in root.iter('node'):
        if node.get('content-desc') in ('Settings', '设置'):
            x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.attrib['bounds']))
            adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))
            return
    raise RuntimeError('Settings button is missing')

def launch():
    adb('shell', 'am', 'force-stop', PACKAGE)
    adb('shell', 'am', 'start', '-W', '-n', f'{PACKAGE}/ee.nekoko.nlpa.MainActivity')
    await_text('通知' if FIXTURE else 'QianLesim')


def bounds(node):
    return tuple(map(int, re.findall(r'\d+', node.attrib['bounds'])))

def tap_id(identifier, scroll=False):
    for _ in range(9 if scroll else 1):
        root = ET.fromstring(hierarchy())
        for node in root.iter('node'):
            if node.get('resource-id', '').split('/')[-1] == identifier:
                x1, y1, x2, y2 = bounds(node)
                if x2 > x1 and y2 > y1 and y2 < 2360:
                    adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))
                    return
        if scroll:
            adb('shell', 'input', 'swipe', '540', '2100', '540', '600', '350')
    raise RuntimeError(f'Visible button missing: {identifier}')

def notification_checks(name):
    xml = await_text('发送并移除')
    for english in ('These messages', ' pending', 'Send all', 'ENABLE', 'DISABLE'):
        assert english not in xml, f'Untranslated notification label: {english}'
    root = ET.fromstring(xml)
    nodes = {node.get('resource-id', '').split('/')[-1]: node for node in root.iter('node')}
    # These are native measured rectangles, not a JSX snapshot. The first
    # visible card must reserve separate space for title, ICCID and actions.
    title, iccid, send, remove = [bounds(nodes[key + '-77']) for key in ('name', 'iccid', 'send', 'remove')]
    assert title[3] <= iccid[1] <= iccid[3] <= send[1], (title, iccid, send)
    assert send[2] <= remove[0], (send, remove)
    for rect in (title, iccid, send, remove):
        assert 0 < rect[0] < rect[2] < 1080, rect
    screenshot(name + '-top')
    tap_id('send-77')
    await_text('通知发送失败')
    screenshot(name + '-send-failed')
    tap_id('button1')
    # The remove action must explain its semantics and must not bypass a
    # failed delivery. The fixture throws if deletion is reached.
    tap_id('remove-77')
    await_text('不会删除 eSIM 配置')
    tap_id('button1')
    await_text('通知发送失败')
    tap_id('button1')
    tap_id('send-all', scroll=True)
    await_text('已发送 0 条；失败 4 条；卡上保留 4 条')
    screenshot(name + '-batch-failed')
    adb('shell', 'input', 'keyevent', '4')
    await_text('QianLesim')

def node_id(identifier):
    for node in ET.fromstring(hierarchy()).iter('node'):
        if node.get('resource-id', '').split('/')[-1] == identifier:
            return node
    raise RuntimeError(f'UI node missing: {identifier}')

def sort_first_text():
    node = node_id('sort-name-0')
    text = node.get('text') or node.get('content-desc') or ''
    assert text.strip(), 'Sort-name accessibility node has no text'
    return text

def sort_checks(name):
    tap_id('profile-sort')
    await_text('长按手柄拖动')
    before = sort_first_text()
    screenshot(name + '-before')
    # Exercise actual gesture handling, including Reanimated compatibility.
    x1, y1, x2, y2 = bounds(node_id('sort-handle-0'))
    tx1, ty1, tx2, ty2 = bounds(node_id('sort-handle-1'))
    x, y, end_y = (x1+x2)//2, (y1+y2)//2, (ty1+ty2)//2
    adb('shell', 'input', 'motionevent', 'DOWN', str(x), str(y))
    time.sleep(0.4)
    for step in range(1, 9):
        adb('shell', 'input', 'motionevent', 'MOVE', str(x), str(y+(end_y-y)*step//8))
        time.sleep(0.06)
    adb('shell', 'input', 'motionevent', 'UP', str(x), str(end_y))
    time.sleep(1)
    assert sort_first_text() != before, 'Drag did not reorder profiles'
    screenshot(name + '-drag')
    # Back cancels the draft.
    adb('shell', 'input', 'keyevent', '4')
    tap_id('profile-sort')
    assert sort_first_text() == before, 'Back unexpectedly saved draft order'
    tap_id('sort-down-0')
    after = sort_first_text()
    assert after != before, 'Arrow did not reorder profiles'
    tap_id('sort-save')
    tap_id('profile-sort')
    assert sort_first_text() == after, 'Saved order did not persist on reopen'
    screenshot(name + '-saved')
    adb('shell', 'input', 'keyevent', '4')
    # Process restart retains the order in MMKV; the fixture republishes chip order.
    launch()
    adb('shell', 'input', 'keyevent', '4')
    await_text('QianLesim')
    tap_id('profile-sort')
    assert sort_first_text() == after, 'Saved order lost after process restart/card refresh'
    adb('shell', 'input', 'keyevent', '4')

def update_checks(name):
    tap_id('check-app-update', scroll=True)
    await_text('检查更新失败')
    screenshot(name + '-failed')
    # Exercise the real Android browser bridge with the release PAGE, not a
    # synthetic APK download. The Google APIs image includes Chrome.
    tap_id('open-app-releases', scroll=True)
    for _ in range(10):
        activity = adb('shell', 'dumpsys', 'activity', 'activities').decode()
        resumed = '\n'.join(line for line in activity.splitlines() if 'ResumedActivity' in line)
        if 'com.android.chrome' in resumed:
            break
        time.sleep(1)
    assert 'com.android.chrome' in resumed, 'Release page did not open in external browser: ' + resumed
    (OUT / (name + '-browser.txt')).write_text(resumed)
    # A fresh emulator's Chrome may launch FirstRunActivity after Main resumes,
    # stealing focus while am start -W waits for our existing singleTask activity.
    # Browser dispatch is verified above. Close only the disposable browser;
    # keep QianLesim alive so its failed-check state and retry path are tested.
    adb('shell', 'am', 'force-stop', 'com.android.chrome')
    adb('shell', 'am', 'start', '-n', f'{PACKAGE}/ee.nekoko.nlpa.MainActivity')
    await_text('检查更新失败')
    tap_id('check-app-update')
    await_text('发现新版本 9.9.9')
    # Reveal but never click the synthetic APK download action.
    for _ in range(4):
        xml = hierarchy()
        if '浏览器下载 APK' in xml and 'UI 测试更新说明' in xml:
            break
        adb('shell', 'input', 'swipe', '540', '2000', '540', '1200', '350')
    assert 'UI 测试更新说明' in xml
    assert '浏览器下载 APK' in xml
    assert '状态同步' not in xml
    screenshot(name + '-available')

try:
    adb('shell', 'wm', 'size', '1080x2400')
    adb('shell', 'wm', 'density', '420')
    adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')
    for mode in ('dark', 'light'):
        adb('shell', 'cmd', 'uimode', 'night', 'yes' if mode == 'dark' else 'no')
        launch()
        if FIXTURE: notification_checks(f'{mode}-notifications-fixture')
        if FIXTURE: sort_checks(f'{mode}-profile-order')
        screenshot(f'{mode}-home-no-euicc')
        open_settings()
        await_text('通用' if FIXTURE else 'General')
        screenshot(f'{mode}-settings')
        if FIXTURE: update_checks(f'{mode}-updates')
    adb('shell', 'cmd', 'uimode', 'night', 'yes')
    adb('shell', 'settings', 'put', 'system', 'font_scale', '1.3')
    launch()
    if FIXTURE: notification_checks('dark-notifications-fixture-large-text')
    screenshot('dark-home-large-text')
    open_settings()
    await_text('通用' if FIXTURE else 'General')
    screenshot('dark-settings-large-text')
    assert b'error during concurrent rendering' not in adb('logcat', '-d', '-s', 'ReactNativeJS'), 'React recovered from a render error'
finally:
    (OUT / 'last-screen.png').write_bytes(adb('exec-out', 'screencap', '-p'))
    (OUT / 'last-screen.xml').write_text(hierarchy())
    (OUT / 'logcat.txt').write_bytes(adb('logcat', '-d', '-t', '2000'))
