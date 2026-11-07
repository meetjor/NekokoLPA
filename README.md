# QianLesim

基于 [iebb/NekokoLPA](https://github.com/iebb/NekokoLPA) 的个人定制 eSIM 管理应用。保留开源项目许可，不是官方 NekokoLPA 版本。

## 1.1.4 安全维护（待本次构建核验）

更新依赖、固定 Actions SHA 并加入 APK 来源证明，补齐中文/类型、精简新版 Android 蓝牙权限，并完善 HTTPS 根证书有效期检查。签名与界面保持一致。当前下载区仍提供已核验的 1.1.3，1.1.4 构建发布完成后更新。详见 [1.1.4 说明](docs/releases/1.1.4.md)。

## 1.1.3 状态栏兼容与通知修复

包含 1.1.2 的全部修复，补旧版 Android 浅色状态栏和通知按钮可读性，Android 14 / 15 模拟器检查已通过，现已发布预发布测试版。详见 [1.1.3 更新说明](docs/releases/1.1.3.md)。

## 1.1.2 通知页与异常恢复

修正通知页红绿按钮穿透、文字重叠和中文缺失；补 USB/BLE 初始化与重连、通知结果和隐私边界。详见 [1.1.2 更新说明](docs/releases/1.1.2.md)。1.1.2 / 407 的构建、162 项 Jest、9 项 HTTPS 测试、验签和 Android 15 通知页检查已通过；已发布为预发布测试版，真机仍待反馈。

## 1.1.1 安全与异常恢复

1.1.1 / 406 改进 HTTPS 校验、停用保护、下载成功反馈、刷新/重连、通知结果和隐私展示；保留现有界面及三签。详细内容见 [1.1.1 更新说明](docs/releases/1.1.1.md)。已完成构建、三证书校验和预发布；**1.1.1 真机测试仍待反馈**。

## 1.1.0 极简 UI

已完成石墨黑 / 科技蓝主题、新几何图标、精简首页与设置，保留每卡独立开关及原有基础功能，移除统计模块。版本为 **1.1.0 / 405**，已完成构建、三证书校验和发布，当前为预发布测试版。

- [1.1.0 发布页](https://github.com/meetjor/NekokoLPA/releases/tag/v1.1.0-qianlesim-3sign)
- [1.1.0 变更说明](docs/releases/1.1.0.md)

## 下载

- **[QianLesim 1.1.3 · ARM64 APK 直接下载](https://github.com/meetjor/NekokoLPA/releases/download/v1.1.3-qianlesim-3sign/QianLesim-v1.1.3-arm64.apk)**
- [1.1.3 发布页](https://github.com/meetjor/NekokoLPA/releases/tag/v1.1.3-qianlesim-3sign) · [构建、测试与签名验证](https://github.com/meetjor/NekokoLPA/actions/runs/42213389165) · [Android 14/15 截图与验证边界](docs/releases/1.1.3-ui-checks.md)

1.1.3 / 408 已通过 TypeScript、162 项 Jest、9 项 Android 原生 HTTPS 测试、ARM64 构建、三枚签名指纹比对，以及 Android 14/15 深浅色、长通知与放大字体检查。下载产物已独立验签，与 Release 的 SHA-256 一致。APK 为 61,799,513 字节，SHA-256：`716d4e6834fcdf233558c8990a5a3c273c58e734f64d67d6f9a5f9a2c8e19e1f`。

请直接覆盖安装，检查通知页与浅色状态栏，再验证读卡和双向切换；无须卸载或删除 eSIM。**2026-11-07 用户反馈本版“真机测试没啥问题”**；没有逐项测试明细，真实运营商下载、USB/BLE 读卡器和异常断连不能据此全部判定通过。后续事项见 [复核清单](docs/reviews/2026-11-07-follow-up.md)。

旧版本与历史验证：

- [QianLesim 1.1.0 · ARM64 APK 直接下载](https://github.com/meetjor/NekokoLPA/releases/download/v1.1.0-qianlesim-3sign/QianLesim-v1.1.0-arm64.apk)
- [1.1.0 构建与签名验证](https://github.com/meetjor/NekokoLPA/actions/runs/42056466890) · [实际 Android 截图与验证范围](docs/releases/1.1.0-ui-checks.md)
- [全部 Releases（包括测试版）](https://github.com/meetjor/NekokoLPA/releases)
- [QianLesim 1.0.1 · ARM64 APK 直接下载](https://github.com/meetjor/NekokoLPA/releases/download/v1.0.1-qianlesim-3sign/QianLesim-v1.0.1-arm64.apk)
- [1.0.1 发布说明](https://github.com/meetjor/NekokoLPA/releases/tag/v1.0.1-qianlesim-3sign) · [构建与签名校验](https://github.com/meetjor/NekokoLPA/actions/runs/42004322468)
- [上一版三证书可用测试版](https://github.com/meetjor/NekokoLPA/releases/tag/v1.14.401-custom-3sign-test2)

此前已验证切换的版本为 **1.0.1（versionCode 404）**，GitHub 上仍标记为预发布版本。包名为 `ee.nekoko.nlpa1`，沿用 Sakura、Community、9eSIM 三证书签名。

1.1.0 已通过 TypeScript、11 个套件共 111 项测试、ARM64 编译、三枚证书指纹比对，以及无 eUICC Android 模拟器的深浅色首页/设置与放大字体页面检查。**2026-11-06 用户反馈本版真机可切换，未感受到问题；下载、外部读卡器和异常场景仍待单独验证。** 请直接覆盖安装，无须卸载或删除 eSIM。

[2026-11-06 代码审查与待改进事项](docs/reviews/2026-11-06-code-review.md)：包含已确认的 HTTPS 校验缺陷和异常恢复问题，1.1.1 已实施对应源码改进，构建及真机验证分别记录；正常切换反馈不等于安全审查通过。

## 1.0.1 更新与验证

- 处理切换期间 SIM REFRESH 可能导致的 OMAPI 响应丢失：即使命令抛出异常，也继续读取 eUICC 核实状态；Adapter 层不直接重发启用/停用命令。
- 保留 QianLesim 名称、图标和已确认的深蓝紫界面。
- 对应源码提交：[`9e6fcb2`](https://github.com/meetjor/NekokoLPA/commit/9e6fcb2df377f1e0d4848581635526ccd73f4167)。Actions 已完成 TypeScript 校验、ARM64 编译、APK 签名验证与发布；日志确认 APK v2 签名有效、签名者数量为 3。
- **2026-11-05 用户真机反馈：最新版已修复切换 Bug。** 此反馈确认原先切换后界面状态不更新的问题已解决；不代表所有设备或异常场景均已测试。
- [开发接管与后续维护记录](docs/QianLesim-maintenance.md)
- [开发者接管入口与项目约束（AGENTS.md）](AGENTS.md)
- [UI 重构设计规范](docs/QianLesim-UI-redesign.md)

## 特色

- QianLesim 极简界面、几何 eSIM 标识，支持深浅色主题
- eSIM 配置切换后自动同步界面，并继续读取 eUICC 状态进行确认
- 遇到异常避免无限 Loading
- 使用缓存的 GitHub Actions ARM64 编译流程
- **继续沿用 Sakura、Community、9eSIM 三证书签名与现有包名**，以维持前一测试版的读卡权限和覆盖安装能力

## 安全提醒

请先验证更新后能正常管理现有 eSIM，再进行正式切换。不要为了安装问题删除运营商 eSIM 配置。

[源码与许可](https://github.com/iebb/NekokoLPA) · [LICENSE](./LICENSE)
