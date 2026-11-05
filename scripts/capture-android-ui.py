#!/usr/bin/env python3
"""Capture real Android emulator UI. No eSIM data is injected or changed."""
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path('dist/ui')
OUT.mkdir(parents=True, exist_ok=True)
PACKAGE = 'ee.nekoko.nlpa1'

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
    await_text('QianLesim')

try:
    adb('shell', 'wm', 'size', '1080x2400')
    adb('shell', 'wm', 'density', '420')
    adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')
    for mode in ('dark', 'light'):
        adb('shell', 'cmd', 'uimode', 'night', 'yes' if mode == 'dark' else 'no')
        launch()
        screenshot(f'{mode}-home-no-euicc')
        open_settings()
        await_text('General')
        screenshot(f'{mode}-settings')
    adb('shell', 'cmd', 'uimode', 'night', 'yes')
    adb('shell', 'settings', 'put', 'system', 'font_scale', '1.3')
    launch()
    screenshot('dark-home-large-text')
    open_settings()
    await_text('General')
    screenshot('dark-settings-large-text')
finally:
    (OUT / 'last-screen.png').write_bytes(adb('exec-out', 'screencap', '-p'))
    (OUT / 'logcat.txt').write_bytes(adb('logcat', '-d', '-t', '2000'))
