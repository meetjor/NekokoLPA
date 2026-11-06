# QianLesim 开发交接

本文件是本仓库的开发入口，适用于 Work、Codex 及后续开发者。以实际源码、Git 历史、Actions、Release 和用户最新反馈恢复状态，不依赖聊天记忆，也不要从零重建项目。

最后更新：2026-11-06。当前维护分支：`feature/qianlesim-v1`。

## 1. 每次接管先做什么

1. 阅读本文件、[维护记录](docs/QianLesim-maintenance.md)、[已确认的 UI 重构规范](docs/QianLesim-UI-redesign.md)、[README](README.md)。修改子目录前检查该目录是否另有 `AGENTS.md`。
2. 检查 `git status --short`、当前分支与近期提交，核实远端维护分支最新 SHA；保留现有未提交工作，禁止盲目覆盖或强制推送。
3. 读取 `package.json` 和 `.github/workflows/qianlesim-release.yml`；有发布任务时实际核实 Actions 与 Release，不把此文件的历史记录当作实时查询结果。
4. 再阅读任务涉及的实现。先说明证据、修改范围和验证方法，做最小可靠改动；常规检查、开发和测试在用户授权范围内自主推进。

仓库：[meetjor/NekokoLPA](https://github.com/meetjor/NekokoLPA)。上游：[iebb/NekokoLPA](https://github.com/iebb/NekokoLPA)。保留上游许可及来源说明。

## 2. 当前状态与 Bug

| 项目 | 已知状态与证据 |
| --- | --- |
| 当前源码版本 | QianLesim 1.1.3 / versionCode 408，补旧版 Android 状态栏；1.1.2 已通过构建、验签和通知 UI 检查并发布 |
| 已发布 APK 的源码基线 | `696398a53a0b928aff9a9d06765c9616e9bddb1a`；后续文档提交不等于新 APK |
| 构建 | [Actions 42176030819](https://github.com/meetjor/NekokoLPA/actions/runs/42176030819) 构建/发布成功，含 TypeScript、147 项 Jest、9 项原生 HTTPS 测试、ARM64 编译、三签指纹校验及模拟器页面检查 |
| 签名验证 | 1.1.1 CI 与下载产物独立验签均确认 APK v2 有效，3 枚证书指纹匹配既有集合；Release 资产哈希与本地一致 |
| 发布 | [v1.1.1-qianlesim-3sign](https://github.com/meetjor/NekokoLPA/releases/tag/v1.1.1-qianlesim-3sign)，预发布；1.1.1 尚无真机反馈，不沿用 1.1.0 的反馈作为本版验收 |
| 原切换 Bug | **用户于 2026-11-05 明确反馈“最新版已经修复切换的bug”**。不要继续把它当作当前未解决问题，或重复追加未经验证的修复 |
| 已知未解决 Bug | 用户报告通知页底色穿透、重叠及中文缺失；1.1.2 已修复源码并复核七项问题，待本次 CI，见[1.1.2 说明](docs/releases/1.1.2.md) |
| 验证边界 | 跨设备、连续切换、异常断连等没有完整逐项回归记录，不得声称已全部通过 |
| 当前下一步 | 完成 1.1.2 构建/验签/页面检查与发布，再收集手机及外接读卡器反馈；按用户澄清暂不扩大到依赖升级。 |

历史故障为切换后 Loading 不结束，以及实际已切换但界面仍显示旧配置、需下拉刷新。之前已尝试 finally 清理 Loading、延迟刷新、轮询、乐观 Redux 更新和 SIM REFRESH 异常处理；复现时必须沿调用链定位，不能简单重复这些方案。

已有源码审查发现的边界问题见维护记录：命令前的预期状态更新、普通读卡使核实任务失效、原生 APDU 重试、手动/自动刷新差异。这些是**排查线索，不是已复现故障**；不因接管审查就主动重写当前实现。

## 3. 必须保留的约束

- 应用名称严格为 **QianLesim**，Android 应用包名保持 **`ee.nekoko.nlpa1`**。不要混淆应用包名与原生源码命名空间 `ee.nekoko.nlpa`。
- 后续 APK 必须沿用 **Sakura、Community、9eSIM 三证书集合**，以保持覆盖安装及 OMAPI 权限兼容性。最初单证书版本曾出现 `ARA-M not supported`，三证书版本已获用户真机读卡与切换反馈。
- 不擅自更换签名、包名；不要求用户删除 eSIM 配置，不执行不可逆的 eSIM 删除来验证功能。
- **UI 需求已更新（2026-11-05）：用户明确要求摆脱原版视觉限制，采用克制的深色极简科技风、简洁几何 eSIM 新图标；旧蓝紫霓虹/星空/轨道图标属于当前已发布旧版，不再是新设计的目标。** 严格按 [`docs/QianLesim-UI-redesign.md`](docs/QianLesim-UI-redesign.md) 实施。保留每个配置自己的启用开关，不新增多余的全局“切换”按钮；不恢复已删除的推广链接。
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
| `android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt`、`RspHttpClient.kt` | 原生通道、SIM REFRESH 后失效通道、单次 APDU 传输及 HTTPS 校验 |
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
bash gradlew :app:testReleaseUnitTest --no-daemon --build-cache -PreactNativeArchitectures=arm64-v8a
bash gradlew assembleRelease --no-daemon --build-cache -PreactNativeArchitectures=arm64-v8a
```

- `apply_variant.sh store` 会覆盖品牌配置、资源及部分平台文件，只在确认工作区状态后执行；不要误提交无关生成变动。
- **上面的 Gradle 产物不是最终三证书发布包。** 必须继续执行工作流的 `Apply public three-signer signature` 步骤：从 `variants/multisign/signing.sh` 提取至 9eSIM 的三签部分再签名。不要以 `variants/store/signing.sh` 或完整 multisign 脚本替代已验证的三签方案。
- 以 `java -jar apksigner.jar verify --verbose --print-certs <APK>` 校验最终包；除校验成功和签名者数量为 3，还需比对[维护记录中的三枚证书 SHA-256](docs/QianLesim-maintenance.md)。不要只凭“有三个签名”判断集合正确。
- 每次新应用发布同步递增 `package.json` 的 `version` 与 `buildVersion`，检查 Gradle 映射，并更新工作流的 APK 文件名、标签、标题、说明及 README 下载地址。
- **发布工作流从 package.json 派生版本并在编译前拒绝已存在标签。** 推送会触发发布的源码修改前，先安排新版本，避免编译成功后发布失败；不要覆盖或删除旧 Release 来规避版本管理。
- 当前 push 过滤包含 src、android、store 资源、package.json、yarn.lock、截图脚本和该工作流，限 `feature/qianlesim-v1`。单改交接文档不应重新编译。
- 构建后核实实际 SHA、Actions 结论、最终签名、Release 资产及浏览器直达下载链接；在最终回复中分别报告源码检查、构建、签名、真机测试状态。
- 真机回归应覆盖安装、读卡、双向切换、无需下拉刷新显示正确状态、Loading 结束；未执行的项目明确列出，不自行填写通过。

当前已发布 APK：[QianLesim-v1.1.1-arm64.apk](https://github.com/meetjor/NekokoLPA/releases/download/v1.1.1-qianlesim-3sign/QianLesim-v1.1.1-arm64.apk)。

## 6. 如何持续维护交接

- 每次影响项目状态的工作结束前更新本文件：当前版本/源码基线、Bug 状态、验证证据、未完成事项和下一步；没有新增信息的纯阅读任务无需制造提交。
- 保持本文件简明且可执行；详细排查、历史和测试证据追加到 `docs/QianLesim-maintenance.md`，README 面向用户维护下载与版本说明。
- 新反馈优先修正当前状态，保留历史结论的日期与证据；将“观察到的故障”“推测原因”“已确认修复”“待测试”明确分开。
- 文档中的源码基线应指向实际构建提交，不必追写文档自身的最新 SHA；实时分支头用 Git 查询，避免自引用和过期记录。
- 新对话必须选中 `feature/qianlesim-v1` 并读取此文件；本文件只随该分支提交，不假设其他分支或所有客户端会自动载入。

## 7. 当前获批的 UI 重构任务（2026-11-05）

- **设计规范的唯一文字入口：** [`docs/QianLesim-UI-redesign.md`](docs/QianLesim-UI-redesign.md)。用户已对“深色、克制、平面几何、简洁科技感”的最新效果图表示认可，明确拒绝此前类似 AI 宣传海报的多层霓虹、玻璃反射、星空和装饰性山脉设计。
- **1.1.0 已实现极简 UI；1.0.1 是旧视觉和已验证切换基线。** CI 和发布已核实，仍不得将其当作真机验证完成。
- **行为必须保留：** 每张 eSIM 配置独立启用开关；点击目标配置直接发起原有启用流程，不添加“切换”总按钮或选卡弹窗。保留真实 SIM1/SIM2/eUICC 设备选择、可读卡、自动状态确认、Loading 清理和原版已有的安全保护逻辑。
- **图标要重新设计：** 简洁可辨的几何 eSIM 芯片轮廓、少色、无轨道光环。1.1.0 已更新几何图标源文件 `assets/branding/qianlesim.svg`、React SVG 组件和 store 各密度图标；Gradle 使用自适应 `@mipmap/ic_launcher`。保留 QianLesim 名称、包名和三证书签名。
- **不要编造功能和数据：** 用户批准的是视觉设计方向，效果图中的统计、切换历史、流量等可能只是示意。无可靠数据源时不得呈现虚假指标或新建无意义页面；现有界面功能应做真实可用的迁移。
- **验收：** 以真实 Android 截图核对视觉（密度、留白、文字、图标、对齐、色彩）、直接启用/停用流程、不同数量配置、长名称、设备不可用、系统字体大小、Loading/读卡异常状态。最终仍需真机测试；不要宣称“与概念图一模一样”。
- **开发顺序：** 阅读现有源码与导航 → 确认哪些概念元素可用 → 定义设计 Token 和组件 → 实现首页/配置/详情/设置 → 视觉与功能回归 → 递增版本并按现有缓存 CI 三签发布。避免因纯文档变动触发 APK 构建。

## 8. 1.1.0 实施交接

- 用户允许调整菜单名称、位置与层级；要求简洁明了，基础功能保留，**统计模块明确移除**。首页没有无意义的底部导航或全局切换按钮。
- 已移除 StatsScreen、Stats 路由和 countryList 收藏统计写入，不清空历史本地存储。
- 本次没有修改 `src/lpa/`、`src/store/`、Android 原生 OMAPI 或三签脚本。
- 工作流增加 Jest、三枚证书指纹比对、发布 SHA 固定以及 Android 模拟器截图检查。对外仅发布三签 ARM64；额外 x86_64 Release 只用于无 eUICC 的模拟器页面检查，不对外发布。
- 页面截图由 `scripts/capture-android-ui.py` 获取，覆盖深浅色首页/设置和放大字体，作为 `QianLesim-Android-UI` Actions artifact 保存。不得称这些截图证明真实读卡/切换已通过。
- 1.1.0 构建/发布已确认；截图见 [UI 验证记录](docs/releases/1.1.0-ui-checks.md)。用户已反馈本版可切换、未感受到问题；没有逐项记录的中文布局、覆盖安装、下载和断连测试仍不能补写通过。后续按反馈更新本文件与维护记录。

## 9. 2026-11-06 代码审查交接

- [详细审查](docs/reviews/2026-11-06-code-review.md)含源码定位、8 项隔离复现及依赖公告匹配；这是修复前的历史审查，后续 1.1.1 实施情况见下一节。
- 优先处理下载 TLS trust-all 和详情页停用保护绕过；APK 三签与 HTTPS 服务证书互不替代，安全修复不应改变原包名/三签。
- 刷新/重连、下载成功反馈、敏感日志、通知结果、自动昵称迁移和写操作重试问题有不同证据等级，实施前阅读详细触发条件。
- 用户当前反馈是“实测可切换，没感受到问题”，只按此范围登记，不宣称所有设备/异常场景已测试。

## 10. 1.1.1 实施交接（2026-11-06）

- 用户已授权开始下一版，并撤回“暂不构建”限制，继续正常自动构建/发布。
- [本版变更与回归清单](docs/releases/1.1.1.md)、[Android HTTPS 信任范围](docs/security/rsp-tls.md)。A1–A10 的源码改进与回归测试已实施；真实硬件异常和下载兼容尚未验证。
- 保留既有正常切换核实流程；底层不再重放结果未知的写 APDU，只读命令可完整重试一次。此变动需要真机复测 SIM REFRESH。
- Android TLS 限制为系统可信根和两枚来源可核验的生产 RSP 根，不信任任意私有/测试 CI；G+D 根于 2027-05-10 到期，须提前复核。不要擅自关闭验证。
- 新增原生 HTTPS 故障测试，CI 构建权限改为只读、发布独立 job。[Actions 42176030819](https://github.com/meetjor/NekokoLPA/actions/runs/42176030819) 和 1.1.1 Release 已核实成功，APK 哈希、测试与截图证据见维护记录；真机仍待反馈。
- 依赖公告的全量治理与 iOS 网络安全仍未完成；本版没有声称“全部漏洞清零”。

- AGP 9 默认只创建 debug 单测；本仓库在 gradle.properties 显式启用 release 单测，CI 使用 `:app:testReleaseUnitTest`。首次构建和测试配置失败记录见维护记录，均未发布 APK。


## 11. 1.1.2 实施交接

- 用户最新要求明确限定为审查清单的七项（A1/A2/A4/A5/A6/A7/A10）和通知页截图问题；不扩大到依赖升级/iOS。
- 七项在 1.1.1 已有修复，本轮复核补上 USB/BLE 初始化被 available=false 跳过、同 id BLE 对象替换、手动重连状态、进度页隐私和通知结果细分等遗漏；见 [1.1.2 说明](docs/releases/1.1.2.md)。
- 通知页改为卡片内按钮，移除透明滑动内容引起的红绿底层穿透，补完整中文和大字体布局。移除的是通知，不是配置；仍只在发送成功后移除。
- 模拟器使用合成通知，注入仅在 ARM64 正式包已签名之后的非发布 x86_64 检查构建。不要把模拟通知当作真机截图，也不要把注入代码加入正式入口。
- 本地 162 项 Jest / TypeScript 通过；发布结论待本次 CI 核实。真机切换/外接读卡器/下载仍需反馈。

## 12. 1.1.3 收尾

- Android 15 自动启用 edge-to-edge，但较旧系统默认不启用，可能造成浅色页面黑状态栏深色文字；通过 RN Gradle `edgeToEdgeEnabled=true` 统一行为，SafeScreen 继续处理安全区和图标色。
- 通知发送按钮使用主题 btnBackground / btnForeground，CI 加入 Android 14 与 15 同 APK 页面检查。验证完成前不得声称旧系统真机问题已确认解决。
- 1.1.2 / 407 与 1.1.3 / 408 是独立构建版本，不覆盖先前标签或 APK；最终下载与证据将在收尾更新。
