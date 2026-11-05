# QianLesim 开发交接

本文件是本仓库的开发入口，适用于 Work、Codex 及后续开发者。以实际源码、Git 历史、Actions、Release 和用户最新反馈恢复状态，不依赖聊天记忆，也不要从零重建项目。

最后更新：2026-11-05。当前维护分支：`feature/qianlesim-v1`。

## 1. 每次接管先做什么

1. 阅读本文件、[维护记录](docs/QianLesim-maintenance.md)、[README](README.md)。修改子目录前检查该目录是否另有 `AGENTS.md`。
2. 检查 `git status --short`、当前分支与近期提交，核实远端维护分支最新 SHA；保留现有未提交工作，禁止盲目覆盖或强制推送。
3. 读取 `package.json` 和 `.github/workflows/qianlesim-release.yml`；有发布任务时实际核实 Actions 与 Release，不把此文件的历史记录当作实时查询结果。
4. 再阅读任务涉及的实现。先说明证据、修改范围和验证方法，做最小可靠改动；常规检查、开发和测试在用户授权范围内自主推进。

仓库：[meetjor/NekokoLPA](https://github.com/meetjor/NekokoLPA)。上游：[iebb/NekokoLPA](https://github.com/iebb/NekokoLPA)。保留上游许可及来源说明。

## 2. 当前状态与 Bug

| 项目 | 已知状态与证据 |
| --- | --- |
| 当前应用版本 | QianLesim 1.0.1，`package.json` 的 `buildVersion` 为 404，即 Android versionCode |
| 已发布 APK 的源码基线 | `9e6fcb2df377f1e0d4848581635526ccd73f4167`；后续文档提交不等于新 APK |
| 构建 | [Actions 42004322468](https://github.com/meetjor/NekokoLPA/actions/runs/42004322468) 成功，含 TypeScript、ARM64 编译、签名校验和发布 |
| 签名验证 | 既有 CI 日志确认 APK v2 有效，签名者数量为 3；不是本次本地重新验签 |
| 发布 | [v1.0.1-qianlesim-3sign](https://github.com/meetjor/NekokoLPA/releases/tag/v1.0.1-qianlesim-3sign)，仍标记预发布 |
| 原切换 Bug | **用户于 2026-11-05 明确反馈“最新版已经修复切换的bug”**。不要继续把它当作当前未解决问题，或重复追加未经验证的修复 |
| 已知未解决 Bug | 当前没有用户新报告的未解决故障；这不表示已经完成所有场景测试 |
| 验证边界 | 跨设备、连续切换、异常断连等没有完整逐项回归记录，不得声称已全部通过 |
| 当前下一步 | 保持已获真机反馈的版本，按用户后续需求维护；没有待完成的功能修复或构建 |

历史故障为切换后 Loading 不结束，以及实际已切换但界面仍显示旧配置、需下拉刷新。之前已尝试 finally 清理 Loading、延迟刷新、轮询、乐观 Redux 更新和 SIM REFRESH 异常处理；复现时必须沿调用链定位，不能简单重复这些方案。

已有源码审查发现的边界问题见维护记录：命令前的预期状态更新、普通读卡使核实任务失效、原生 APDU 重试、手动/自动刷新差异。这些是**排查线索，不是已复现故障**；不因接管审查就主动重写当前实现。

## 3. 必须保留的约束

- 应用名称严格为 **QianLesim**，Android 应用包名保持 **`ee.nekoko.nlpa1`**。不要混淆应用包名与原生源码命名空间 `ee.nekoko.nlpa`。
- 后续 APK 必须沿用 **Sakura、Community、9eSIM 三证书集合**，以保持覆盖安装及 OMAPI 权限兼容性。最初单证书版本曾出现 `ARA-M not supported`，三证书版本已获用户真机读卡与切换反馈。
- 不擅自更换签名、包名；不要求用户删除 eSIM 配置，不执行不可逆的 eSIM 删除来验证功能。
- 保留已确认的深蓝紫科技风、eSIM 芯片轨道图标、圆角配置卡片和设置页；未经用户提出，不重做 UI，不恢复已删除的推广链接。
- 点击切换、命令返回成功、卡上状态已确认、Redux 更新和界面显示是不同阶段。未确认时明确显示同步中或未确认，不能伪造硬件成功。
- 不把“提交成功”写成“构建成功”，也不把“构建成功”写成“真机测试通过”。用户反馈要注明来源和覆盖范围。
- 公开文档和日志不要包含完整 ICCID、EID、激活码、私密 APDU 数据或凭据。

## 4. 代码入口

技术栈：React Native、TypeScript、Tamagui、Redux、Android OMAPI、GitHub Actions。

| 文件 | 排查职责 |
| --- | --- |
| `src/lpa/adapters/Adapter.ts` | 操作锁、切换流程、读卡、Redux 发布、后台状态核实 |
| `src/lpa/adapters/OmapiDevice.ts` | JS 侧 OMAPI 设备接口；当前 connect/reconnect 仅返回可用标记 |
| `src/lpa/bridge/runtime.ts` | 每设备 dispatcher 缓存、传输异常和通道处理 |
| `src/lpa/core/lpa.ts`、`dispatcher.ts` | ES10c 命令、结果码解析、命令分发 |
| `android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt` | 原生通道、SIM REFRESH 后异常、APDU 重试；JS 不重试不等于原生不重试 |
| `src/features/main/ProfileSelector.tsx`、`ProfileRow.tsx` | 下拉刷新、FlatList、memo、状态标记与切换按钮 |
| `src/store/slices.ts`、`src/store/index.ts` | 设备状态合并及选择器 |
| `.github/workflows/qianlesim-release.yml` | 缓存、校验、编译、三证书签名与发布 |

若切换故障复现，关联记录命令发送、协议成功/异常、真实卡状态、Redux 与最终界面状态；同时检查刷新竞态及原生通道生命周期。日志使用脱敏标识。

## 5. 构建、签名与发布

优先复用现有 Actions 和 Yarn / Gradle / 原生编译缓存。工作流是构建方法的依据，不另建项目或更换工具链。

现有 CI 使用 Java 17、Node 24、仓库固定的 Yarn 3.6.4、Android platform/build-tools 36、NDK 27.1.12297006。工作流在构建环境将 Gradle 的 SDK/build-tools 37 替换为 36；本地复现时需要同样准备，不要把环境调整误提交为功能修改。

在依赖、SDK 已准备好的构建检出中，主要步骤为：

```bash
corepack enable
yarn install --immutable
yarn type-check
# 按改动运行有针对性的 Jest 测试，例如修改 LPA core 时：
yarn test src/lpa/core/__tests__ --runInBand
bash apply_variant.sh store
cd android
bash gradlew assembleRelease --no-daemon --build-cache -PreactNativeArchitectures=arm64-v8a
```

- `apply_variant.sh store` 会覆盖品牌配置、资源及部分平台文件，只在确认工作区状态后执行；不要误提交无关生成变动。
- **上面的 Gradle 产物不是最终三证书发布包。** 必须继续执行工作流的 `Apply public three-signer signature` 步骤：从 `variants/multisign/signing.sh` 提取至 9eSIM 的三签部分再签名。不要以 `variants/store/signing.sh` 或完整 multisign 脚本替代已验证的三签方案。
- 以 `java -jar apksigner.jar verify --verbose --print-certs <APK>` 校验最终包；除校验成功和签名者数量为 3，还需比对[维护记录中的三枚证书 SHA-256](docs/QianLesim-maintenance.md)。不要只凭“有三个签名”判断集合正确。
- 每次新应用发布同步递增 `package.json` 的 `version` 与 `buildVersion`，检查 Gradle 映射，并更新工作流的 APK 文件名、标签、标题、说明及 README 下载地址。
- **当前发布工作流硬编码 1.0.1 标签，且该标签已存在。** 推送会触发发布的源码修改前，先安排新版本，避免编译成功后发布失败；不要覆盖或删除旧 Release 来规避版本管理。
- 当前 push 过滤只有 `src/**` 与该工作流自身，限 `feature/qianlesim-v1`；单改 Android 或 package.json 不会自动触发，需按需求调整过滤或使用 `workflow_dispatch`。单改交接文档不应重新编译。
- 构建后核实实际 SHA、Actions 结论、最终签名、Release 资产及浏览器直达下载链接；在最终回复中分别报告源码检查、构建、签名、真机测试状态。
- 真机回归应覆盖安装、读卡、双向切换、无需下拉刷新显示正确状态、Loading 结束；未执行的项目明确列出，不自行填写通过。

当前已发布 APK：[QianLesim-v1.0.1-arm64.apk](https://github.com/meetjor/NekokoLPA/releases/download/v1.0.1-qianlesim-3sign/QianLesim-v1.0.1-arm64.apk)。

## 6. 如何持续维护交接

- 每次影响项目状态的工作结束前更新本文件：当前版本/源码基线、Bug 状态、验证证据、未完成事项和下一步；没有新增信息的纯阅读任务无需制造提交。
- 保持本文件简明且可执行；详细排查、历史和测试证据追加到 `docs/QianLesim-maintenance.md`，README 面向用户维护下载与版本说明。
- 新反馈优先修正当前状态，保留历史结论的日期与证据；将“观察到的故障”“推测原因”“已确认修复”“待测试”明确分开。
- 文档中的源码基线应指向实际构建提交，不必追写文档自身的最新 SHA；实时分支头用 Git 查询，避免自引用和过期记录。
- 新对话必须选中 `feature/qianlesim-v1` 并读取此文件；本文件只随该分支提交，不假设其他分支或所有客户端会自动载入。
