# QianLesim

基于 [iebb/NekokoLPA](https://github.com/iebb/NekokoLPA) 的个人定制 eSIM 管理应用。保留开源项目许可，不是官方 NekokoLPA 版本。

## 下载

- [全部 Releases（包括测试版）](https://github.com/meetjor/NekokoLPA/releases)
- [QianLesim 1.0.1 · ARM64 APK 直接下载](https://github.com/meetjor/NekokoLPA/releases/download/v1.0.1-qianlesim-3sign/QianLesim-v1.0.1-arm64.apk)
- [1.0.1 发布说明](https://github.com/meetjor/NekokoLPA/releases/tag/v1.0.1-qianlesim-3sign) · [构建与签名校验](https://github.com/meetjor/NekokoLPA/actions/runs/42004322468)
- [上一版三证书可用测试版](https://github.com/meetjor/NekokoLPA/releases/tag/v1.14.401-custom-3sign-test2)

当前维护版本为 **1.0.1（versionCode 404）**，GitHub 上仍标记为预发布版本。包名为 `ee.nekoko.nlpa1`，沿用 Sakura、Community、9eSIM 三证书签名。

## 1.0.1 更新与验证

- 处理切换期间 SIM REFRESH 可能导致的 OMAPI 响应丢失：即使命令抛出异常，也继续读取 eUICC 核实状态；Adapter 层不直接重发启用/停用命令。
- 保留 QianLesim 名称、图标和已确认的深蓝紫界面。
- 对应源码提交：[`9e6fcb2`](https://github.com/meetjor/NekokoLPA/commit/9e6fcb2df377f1e0d4848581635526ccd73f4167)。Actions 已完成 TypeScript 校验、ARM64 编译、APK 签名验证与发布；日志确认 APK v2 签名有效、签名者数量为 3。
- **2026-11-05 用户真机反馈：最新版已修复切换 Bug。** 此反馈确认原先切换后界面状态不更新的问题已解决；不代表所有设备或异常场景均已测试。
- [开发接管与后续维护记录](docs/QianLesim-maintenance.md)

## 特色

- QianLesim 品牌界面与 eSIM 轨道标识、蓝紫深色主题
- eSIM 配置切换后自动同步界面，并继续读取 eUICC 状态进行确认
- 遇到异常避免无限 Loading
- 使用缓存的 GitHub Actions ARM64 编译流程
- **继续沿用 Sakura、Community、9eSIM 三证书签名与现有包名**，以维持前一测试版的读卡权限和覆盖安装能力

## 安全提醒

请先验证更新后能正常管理现有 eSIM，再进行正式切换。不要为了安装问题删除运营商 eSIM 配置。

[源码与许可](https://github.com/iebb/NekokoLPA) · [LICENSE](./LICENSE)
