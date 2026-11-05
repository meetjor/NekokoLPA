# NekokoLPA · 精简定制版

基于 [iebb/NekokoLPA](https://github.com/iebb/NekokoLPA) 的个人定制 Android eSIM 管理工具。

## 下载最新版

**[直接下载 APK · v1.14.401-custom-3sign-test2](https://github.com/meetjor/NekokoLPA/releases/download/v1.14.401-custom-3sign-test2/NekokoLPA-polished-3sign-arm64.apk)**（ARM64，约 62 MB）

**[查看 GitHub Releases 发布页（包含后续新版本）](https://github.com/meetjor/NekokoLPA/releases)**

> 当前为测试版本（Pre-release）。GitHub 的 `/releases/latest` 通常不会将预发布版本视为“最新正式版”，请从上面的 **Releases 发布页** 查看最新发布，或使用当前 APK 直链。

## 主要改动

- 精简首页及设置页中不必要的外部链接。
- eSIM 操作异常时正确结束 Loading，避免部分操作失败后持续遮挡界面。
- 切换配置后自动重新读取芯片状态，必要时短暂延迟同步，不再完全依赖下拉手动刷新。
- 调整 eSIM 配置卡片、启用状态标识和设置页样式。
- GitHub Actions 增加 Yarn、Gradle、ARM64 编译缓存。

**验证状态：** 上一版三证书测试包已在真实手机上验证可读取 eSIM 并切换成功；本次自动状态同步与新界面仍需安装新版本后验证。

## 安装说明

- 本版采用 Sakura、Community、9eSIM **三个公开证书**签名，并非官方完整的五证书 Multisign 包。
- 已安装上一版 **三证书测试版** 的手机，一般可以直接覆盖更新。
- 单证书测试版或官方版与本版签名不同，可能提示软件包冲突；更换签名前先确认备份必要的应用设置，卸载时不要勾选保留旧应用数据。
- 卸载管理应用通常不会删除芯片上已有的 eSIM 配置；**不要为排查安装问题而删除 eSIM 配置**。

## 源码与构建

- [当前定制开发分支](https://github.com/meetjor/NekokoLPA/tree/test/multisign-compat)
- [最新版本构建记录](https://github.com/meetjor/NekokoLPA/actions/runs/41995492507)
- [原项目与许可](https://github.com/iebb/NekokoLPA) · [LICENSE](./LICENSE)
