# QianLesim

基于 [iebb/NekokoLPA](https://github.com/iebb/NekokoLPA) 的个人定制 eSIM 管理应用。保留开源项目许可，不是官方 NekokoLPA 版本。

## 下载

- [全部 Releases（包括测试版）](https://github.com/meetjor/NekokoLPA/releases)
- [上一版三证书可用测试版](https://github.com/meetjor/NekokoLPA/releases/tag/v1.14.401-custom-3sign-test2)
- QianLesim 1.0.0 将由当前分支构建验证后发布，请从 Releases 查看真实已发布的 APK。

## 特色

- QianLesim 品牌界面与 eSIM 轨道标识、蓝紫深色主题
- eSIM 配置切换后即时更新界面，并继续读取真实 eUICC 状态进行确认
- 遇到异常避免无限 Loading
- 使用缓存的 GitHub Actions ARM64 编译流程
- **继续沿用 Sakura、Community、9eSIM 三证书签名与现有包名**，以维持前一测试版的读卡权限和覆盖安装能力

## 安全提醒

请先验证更新后能正常管理现有 eSIM，再进行正式切换。不要为了安装问题删除运营商 eSIM 配置。

[源码与许可](https://github.com/iebb/NekokoLPA) · [LICENSE](./LICENSE)
