# 1.1.4 依赖与发布安全维护

## 扫描范围与修复

2026-11-07 更新安装树后扫描 npm，包括开发依赖与每个嵌套副本。`yarn security:audit` 调用 npm 官方 bulk advisory API，不把版本命中直接称为可利用的 APK 漏洞。最新报告和完整版本清单由 CI 保存为 `QianLesim-Security-Audit` artifact。

- BLE 3.2.1 → 3.5.1：上游移除了 Expo 依赖并已包含旧 Promise null reject 补丁；移除原 3.2.1 补丁，保留现有 JS 接口。参考 [上游发布](https://github.com/dotintent/react-native-ble-plx/releases)。外接蓝牙硬件需要真机回归。
- Babel、YAML、Joi、ws、lodash、minimatch、picomatch 等优先在原声明范围内更新锁文件，没有整体升级 RN、Tamagui 或导航框架。
- 对构建期残留，定向将 module-resolver 的 glob 更新为 14.0.4、typescript-estree 的 minimatch 更新为 11.0.5。前者 CommonJS 命名空间导出有差异，因此增加小补丁改用 `hasMagic` / `globSync` 命名导出；Jest、TS、ESLint 和实际 Metro 构建验证兼容性。不要移除 resolution 却保留补丁。
- [deepmerge GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) 暂无上游修复版。4.3.1 本地补丁在复制 target 与 source 两条路径都忽略 `__proto__`，覆盖 CJS/UMD/源码；测试原型投毒、null prototype target、嵌套及正常合并。扫描仍会按版本报告此项；仅当公告 URL、版本、每个副本的文件 SHA-256 和行为测试都匹配，才记为 locally-patched。2027-02-01 前必须复核上游，不使用无期限全局忽略。
- `audit-native.cjs` 对 Gradle 实际解析出的 Android releaseRuntimeClasspath Maven 坐标查询 OSV；`native-inventory.gradle` 不依靠文本依赖树猜版本。网络失败、空清单或未处理命中阻止发布。此范围不等于所有 C/C++ 内嵌源码、操作系统或硬件固件都经过安全审计。

## 发布来源

保留公开 Sakura / Community / 9eSIM 兼容签名。任何持有这些公开材料的人也能签 APK，因此“签名集合相同”只能说明兼容集合匹配，不能单独证明是本仓库构建。

发布工作流：固定所有 action 完整 SHA（来源映射见 `actions-pins.json`），checkout 不保存凭据，构建 job 保持只读。发布 job 下载同一运行的已验证三签 APK、核对哈希、通过 GitHub OIDC/Sigstore 生成 SLSA 来源证明，并在发布前约束仓库、工作流、源码 SHA、分支与 GitHub 托管 runner。Release 同时附带 `provenance.jsonl` 与验证结果。

下载后可使用支持 attestations 的 GitHub CLI（将 SOURCE_SHA 换成该版构建提交）：

```bash
gh attestation verify QianLesim-v1.1.4-arm64.apk \
  --repo meetjor/NekokoLPA \
  --signer-workflow meetjor/NekokoLPA/.github/workflows/qianlesim-release.yml \
  --source-ref refs/heads/feature/qianlesim-v1 \
  --source-digest SOURCE_SHA --deny-self-hosted-runners
```

同时独立校验 APK v2/三枚指纹与 SHA-256。来源证明不代表源码无漏洞，也不能抵御仓库账户或获授权工作流被攻陷；本轮没有更改仓库管理员权限/分支保护设置。

参考：[GitHub attest](https://github.com/actions/attest)、[CLI 验证](https://cli.github.com/manual/gh_attestation_verify)、[OSV API](https://google.github.io/osv.dev/api/)。
