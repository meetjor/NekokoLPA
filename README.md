# NekokoLPA · 简洁版

基于 [iebb/NekokoLPA](https://github.com/iebb/NekokoLPA) 的个人修改版 Android eSIM 管理工具。

主要改动：简化首页与设置页的外部链接；修复部分 eSIM 切换操作出错后 Loading 不消失的问题（仍需真机验证）。

## 下载 APK

**[前往 GitHub Actions 下载](https://github.com/meetjor/NekokoLPA/actions/runs/41846062518)**

打开构建页面，在底部 **Artifacts** 下载 `NekokoLPA-custom-apk`，解压 ZIP 后安装其中的 APK。

> 本次构建产物有效期至 **2026-11-18**。过期后需重新构建。GitHub 可能要求登录后才能下载。

## 安装提示

自编译 APK 的签名可能与官方版不同，无法直接覆盖安装；手机内部 eSIM（OMAPI）访问还可能受应用签名权限限制。**确认新版本能正常读取并切换 eSIM 前，不要卸载原版或删除现有 eSIM 配置。**

## 源码

- [定制修改分支](https://github.com/meetjor/NekokoLPA/tree/fix/esim-loading-clean-ui)
- [APK 构建记录](https://github.com/meetjor/NekokoLPA/actions/runs/41846062518)
- [原项目与许可](https://github.com/iebb/NekokoLPA) · [LICENSE](./LICENSE)
