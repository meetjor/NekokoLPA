# QianLesim 维护记录

## 2026-11-05 开发接管

维护分支：`feature/qianlesim-v1`。本次核实的应用源码基线为 `9e6fcb2df377f1e0d4848581635526ccd73f4167`，版本 1.0.1 / versionCode 404。

用户在本次源码审查期间明确反馈：“最新版已经修复切换的bug”。据此保留当前已获真机反馈的实现，不继续修改切换逻辑，不重复构建或发布新 APK。本次提交仅更新文档。

### 已核实证据

- [构建 42004322468](https://github.com/meetjor/NekokoLPA/actions/runs/42004322468)：build job 成功，检出的提交为上述源码基线；TypeScript、ARM64 编译、签名校验和发布步骤均成功。
- [1.0.1 Release](https://github.com/meetjor/NekokoLPA/releases/tag/v1.0.1-qianlesim-3sign)：已发布的预发布版本，资产为 `QianLesim-v1.0.1-arm64.apk`，大小 62,069,727 字节。
- 发布资产 SHA-256：`6a640572919cc1f8fb2d1e8ba013760c67d01079e6ef255f841ce76ed1949150`。
- 构建日志中 `apksigner verify` 显示 `Verifies`、v2=true、`Number of signers: 3`。这是对既有 CI 校验日志的核实，本次没有另行下载 APK 重新验签。
- 用户确认最新版切换 Bug 已修复；此前用户已确认三证书版本可读取 eSIM 并实际切换。尚无跨设备、断连、连续切换等完整回归结果。

签名证书 SHA-256（按该构建输出顺序）：

1. `dd0dddbee79fc418ccf1523e670ff62f22926ed76a8ff50b1b63106195deab13`
2. `4139278aacce8338c03dc9a6b0172c1880e0a4949ff3e05292c2e781765026fa`
3. `6966004ad0161165335f9204f8f5a52df49fe068c9545c0c589c23221af8d3a4`

### 源码审查与边界问题

以下为代码行为与后续排查线索，**不是已复现的当前故障，也不推翻用户的真机反馈**。

- `src/lpa/core/lpa.ts`：`profileOperation()` 检查 ES10c 结果码，仅 `00` 正常返回；`dispatcher.ts` 在该调用完成后返回 `{result: 0}`。当前代码能区分协议操作返回成功和抛出异常，但异常本身不能证明卡上未执行。
- `src/lpa/adapters/Adapter.ts`：1.0.1 在命令执行前调用 `showExpectedState()`，会把目标配置写为启用并标记同步中。该状态是预期状态，不是硬件确认。若未来调整，应该将“待核实目标”和“最后一次真实读卡状态”分开，避免在未知结果时呈现确定的成功。
- 同文件：普通 `getProfiles(true)` 会递增 `switchGeneration` 并清除同步标记；切换后的验证使用 `getProfiles(false)` 并比较目标状态。普通刷新或重命名引发的读卡可能使后台验证失效，需要在复现时结合时序日志判断。
- 手动下拉刷新调用 `adapter.refresh()`：读取 eUICC 信息后读取并发布配置，异常时尝试 `initialize()`。自动验证也先读 eUICC 信息，但随后只在目标状态匹配时发布结果，采用不同的失败处理及后台重试路径。两者并非完全相同。
- `src/lpa/adapters/OmapiDevice.ts` 的连接/重连方法只返回可用标记，没有直接重建原生通道。`src/lpa/bridge/runtime.ts` 缓存每设备 dispatcher，将传输异常转成 `6000` 状态字。重新 setup dispatcher 不等于重新打开 OMAPI 通道。
- `android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt`：原生 `transceiveOMAPI()` 在部分 I/O、通道异常及 `6d00` 情况下重连并重发同一 APDU。因此 Adapter 层的“不重发切换命令”不等于底层从不重发。不要未经真机证据就扩大修改，也不要在排查时忽略这一层。
- `src/store/slices.ts` 使用 Immer 合并设备状态；`ProfileSelector` 根据 profiles 引用重新映射 selected，状态标记也包含在 renderItem 依赖中；`ProfileRow` 的 memo 比较包括 profileState、syncing、syncError。当前没有证据能把原故障归因于 React.memo 或 FlatList。
- 现有日志尚不足以完整关联命令、卡状态、Redux 和最终渲染。若故障复现，再增加关联日志；不得记录完整 ICCID、EID、激活码或 APDU 载荷到公开诊断资料。

### 后续维护约束

- 保留 `QianLesim` 大小写、`ee.nekoko.nlpa1` 包名以及 Sakura / Community / 9eSIM 三证书集合。
- 保留已确认的深蓝紫界面和 eSIM 轨道图标，优先最小功能修复。
- 不删除 eSIM 配置来测试，不把点击切换当作硬件已切换。
- 后续应用发布需同步更新 package.json 的 version/buildVersion、工作流版本与发布说明，先 TypeScript 校验，再构建、验签、核实 Release 资产。
- 当前 release workflow 的 push 路径过滤仅包含 `src/**` 与工作流自身；单独修改 Android 原生代码或 package.json 不会自动触发此工作流，届时需调整路径过滤或手动触发。
- 当前工作流硬编码 1.0.1 发布标签，继续推送源码前必须安排新版本，避免构建后因旧标签已存在导致发布失败。本次文档提交不触发该发布工作流。
- 需要回归时，覆盖安装后确认可读卡，再双向切换，观察无需下拉刷新即可显示正确状态及 Loading 正常结束；用户本次没有提供这些逐项测试记录，不自行补写为已通过。

## 2026-11-05 后续 UI 重构需求更新（仅交接文件）

用户在最新版切换 Bug 修复后提出 UI 重构，经过多轮视觉讨论，**不再接受旧深蓝紫霓虹/轨道图标/星空山脉装饰**，而是认可**深色石墨黑、细线科技蓝、扁平几何芯片标识、真实 Android 应用感**的简洁方案。详见 [UI 重构规范](QianLesim-UI-redesign.md)。

**唯一不能改的核心交互：每张 eSIM 有自己的启用开关。** 不要新增独立“切换”按钮及“点击切换→选卡→确认”的冗余步骤。切换后的读卡确认和原有安全保护仍应保留。

目前仅批准设计方向，**没有**提交新版 UI 源码，没有新 APK，没有新增的统计/历史数据功能。原 1.0.1 已获用户真机修复反馈仍有效，不因 UI 任务而改变 Bug 状态。新 UI 实现后需单独通过真机视觉和功能验收。

## 2026-11-05 1.1.0 极简 UI 实施

按用户授权重构主题、首页、配置卡片、设备摘要/详情、设置与共享页面标题，移除统计模块及写入，更新应用/自适应/单色图标；基础流程与三证书集合保留。UI 不再绑定旧导航结构。

源码版本 1.1.0 / 405。本地 TypeScript 校验、11 个测试套件共 111 项测试、改动文件 ESLint、git diff --check 通过。LPA、Redux 与原生 OMAPI 目录无差异。缓存 CI 加入独立 x86_64 模拟器页面检查以及证书指纹比对，发布资产仍仅三签 ARM64。当前提交时构建/发布尚待核实，真机 UI 和切换回归待用户完成。


## 2026-11-06 1.1.0 发布核验

- 发布源码：`c7d7f5989b06578711380bdd75134169282db81b`；UI 主提交为 `ae4f6895533b9776a3ce3467ffa07568d4f95c74`。
- [Actions 42056466890](https://github.com/meetjor/NekokoLPA/actions/runs/42056466890) 全部成功。TypeScript、111 项测试、ARM64 与模拟器 x86_64 编译、三签校验及页面检查通过。
- 第一次运行 42055655423 在页面检查阶段失败；测试脚本改为忽略 Android 大写标签的大小写后，第二次运行通过。首轮没有发布；未修改应用业务逻辑解决此测试问题。
- 最终 APK v2 有效，三个签名指纹与本文记录的 Sakura / Community / 9eSIM 集合逐一一致；对外发布的是 ARM64 三签 APK。
- [1.1.0 Release](https://github.com/meetjor/NekokoLPA/releases/tag/v1.1.0-qianlesim-3sign) 已发布，预发布标记保留；APK 大小 61,766,623 字节，SHA-256 `9095fc4ae6ec39b507576f6e78454f1ca6421f12d28d963588f604b80b94ef3b`。同时提供 `SHA256SUMS.txt` 与 `signing.txt`。
- 已查看模拟器实际截图：深浅色设置、无 eUICC 首页、1.3 倍字体设置，未见文字相互覆盖；长设置名能够换行。截图和验证边界见 [UI 检查记录](releases/1.1.0-ui-checks.md)。
- 尚未完成：用户真机覆盖安装、读卡和双向切换、新配置列表与中文布局、多个/长名称配置、桌面图标实际观感。不得把模拟器通过等同于这些项目通过。
- 本次收尾仅更新文档及截图，不重复编译、不修改已发布资产。下一次源码发布必须递增版本和工作流标签。


## 2026-11-06 用户反馈与代码审查

用户反馈 QianLesim 1.1.0“实测可切换，没感受到问题”。保留此真机基线。对远端 9a252df 的审查见[详细报告](reviews/2026-11-06-code-review.md)。TypeScript 与 111 项原有测试仍通过；另用 mock 硬件/网络的 8 项隔离断言复现异常分支。发现 TLS 信任验证关闭、详情停用保护不一致等问题，尚未修复；不视为已报告的正常切换故障。本轮仅更新审查/交接文档与复现材料，不改变应用源码或发布资产。

## 2026-11-06 · 1.1.1 实施，等待 CI

按用户最新授权恢复自动构建。版本 1.1.1 / 406，详细范围见 [发布说明](releases/1.1.1.md)。保留 `ee.nekoko.nlpa1` 和三签，UI 未重做。审查 A1–A10 已做源码改进；测试使用假卡/假服务，没有执行真实卡删除。新增原生 HTTPS 测试须由 CI 核实，真实运营商下载、连续切换与读卡器断连仍待手机回归。

首次 1.1.1 CI [42143287536](https://github.com/meetjor/NekokoLPA/actions/runs/42143287536) 在 Kotlin 编译中失败：OMAPI Channel 使用了不存在的 `isClosed`；已按 Android API 改为 `!isOpen`。本次没有生成或发布新 APK。补充设备移除期间页面空 adapter 保护，成功同步后移除待同步提示。HTTPS 原生测试前置到完整组装之前，并允许维护分支写入 Gradle 缓存，减少后续重复编译。

第二次 CI [42175321133](https://github.com/meetjor/NekokoLPA/actions/runs/42175321133) 尚未运行测试用例，失败原因是 AGP 9 默认仅为 debug 创建单元测试任务，找不到 `testReleaseUnitTest`。已依据 [Android 官方变更说明](https://developer.android.com/build/releases/agp-9-0-0-release-notes) 显式配置 `android.onlyEnableUnitTestForTheTestedBuildType=false`，并将 CI 任务限定为 `:app:testReleaseUnitTest`。没有绕过测试或发布 APK；Gradle 缓存本次已成功保存。


## 2026-11-06 · 1.1.1 发布核验与交接

- 发布源码 `696398a53a0b928aff9a9d06765c9616e9bddb1a`，功能主提交 `b6409cada4e7617619b2d9d03bc6e2d729236d6e`；后续文档提交不改变 APK。
- [Actions 42176030819](https://github.com/meetjor/NekokoLPA/actions/runs/42176030819) 的 build 与 publish 均成功；TypeScript、18 个 Jest 套件共 147 项测试、ARM64/x86_64 编译通过。
- 已读取原生 HTTPS XML：9 项测试、0 失败、0 错误、0 跳过。覆盖有效证书、错误主机名、过期/不可信证书、重定向、明文/畸形 URL、截断与超大正文、生产根加载。
- APK 内生产 RSP 根指纹经 CI 检查；最终三签产物已下载并用 apksigner 独立复核，v2=true，签名数量 3，指纹与本文既有集合逐一匹配。
- [Release v1.1.1-qianlesim-3sign](https://github.com/meetjor/NekokoLPA/releases/tag/v1.1.1-qianlesim-3sign) 已发布，预发布标记保留；标签指向上述构建 SHA。APK 为 61,774,937 字节，SHA-256 `aee23bfda9ab1a0d687a4097b1b0fed5502e93e90e56b5fa5a04df5e73c4d142`，Release 资产摘要与下载文件完全一致；同时发布 SHA256SUMS.txt 与 signing.txt。
- [浏览器直接下载 APK](https://github.com/meetjor/NekokoLPA/releases/download/v1.1.1-qianlesim-3sign/QianLesim-v1.1.1-arm64.apk)。包名与 Sakura / Community / 9eSIM 三签不变。
- 已查看六张无 eUICC 模拟器截图，深浅色首页/设置以及 1.3 倍字体页面正常启动、可导航；大字体英文错误提示贴近屏幕两侧，记录为后续留白/换行改进。截图与测试 artifact 的链接、保留期见 [1.1.1 说明](releases/1.1.1.md)。不将无卡截图当作真实配置列表或 OMAPI 验收。
- **1.1.1 尚未真机测试。** 用户此前正常切换反馈属于 1.1.0。下一步按发布说明覆盖安装、读卡、双向切换并观察 Loading/状态自动确认；有正常下载需求时再验证运营商 HTTPS，不为测试删除或购买配置。USB/BLE 重连、SIM REFRESH 和跨设备兼容仍待反馈。
- 后续独立处理剩余依赖公告与 iOS 网络安全；G+D 生产根在 2027-05-10 到期前复核。本次没有承诺兼容所有私有/测试 RSP CI，也没有宣称全部漏洞清零。
- 本次收尾仅更新 AGENTS.md、README 与维护/发布说明，不重复编译，不覆盖已发布资产。


## 2026-11-06 · 1.1.2 七项问题复核与通知页

用户提供深浅色通知页截图，并澄清“剩下的”专指七项原审查问题。实际确认滑动行内容透明导致操作底层透出、通知中文缺失；改为卡片和显式按钮。另复核发现 1.1.1 将 USB/BLE 构造时的 available=false 误视为无需初始化，本版修复并补外接设备测试；同 id 新 BLE 对象、手动重连状态、通知投递/移除/刷新结果、进度隐私与编辑原始值边界一起收口。没有访问真实卡、没有使用用户截图中的真实标识构造测试，没有执行 eSIM 删除。

本地 TypeScript、ESLint 与 21 套件 162 项 Jest 通过。CI 用合成数据检查实际通知页与交互，注入发生在正式 ARM64 包签名上传之后，仅用于非发布 x86_64 包。发布与截图结果待本轮 CI；七项对应源码/测试与真机回归步骤见 [1.1.2 说明](releases/1.1.2.md)。不将 1.1.1 的成功构建套用到本版，也不将正常切换反馈冒充外接设备或下载验收。

## 2026-11-06 · 1.1.2 发布核验与 1.1.3 状态栏收尾

- 1.1.2 源码 `2573139fa06990f5f502ee1042a2f2009368cfa9`，[Actions 42210999769](https://github.com/meetjor/NekokoLPA/actions/runs/42210999769) 构建和发布成功；162 Jest、9 原生 HTTPS、Android 15 深浅/大字体合成通知检查通过。
- ARM64 APK 61,783,129 字节，SHA-256 `6255fb548f0ba7dbf78ef64aced347238c56fb0674dde0b6e83c9522ac492da7`，独立验签确认 v2 / 三证书指纹与既有集合完全相同；Release API 资产哈希、大小、目标源码一致，正式 bundle 无 `QL_UI_FIXTURE_ONLY`。
- 1.1.2 合成通知截图已人工核对，无红绿底层穿透、标题/ICCID/按钮重叠；失败通知仍保留。真实设备未测。
- 对用户浅色截图状态栏继续追踪：RN 0.88 自动 edge-to-edge 限 Android 15+；较旧系统仍可能是黑底，而 SafeScreen 已切深色图标。1.1.3 / 408 使用 RN Gradle 支持的 edgeToEdgeEnabled，保留 SafeAreaInsets；CI 加 Android 14 同包检查。不是更改签名或硬件路径。

## 2026-11-07 · 1.1.3 最终核验（北京时间）

- [Actions 42213389165](https://github.com/meetjor/NekokoLPA/actions/runs/42213389165) 构建和发布成功，源码 `3dcb622ab1d032efcd9be8a6231d93116c479711`；[Release](https://github.com/meetjor/NekokoLPA/releases/tag/v1.1.3-qianlesim-3sign) 为预发布。
- TypeScript、21 套件共 162 Jest、9 项原生 HTTPS 测试、ARM64、Android 14/15 全套页面检查通过。原生报告 0 failure / error / skipped。
- 下载产物独立验签成功，APK v2 和三枚 SHA-256 指纹与既有 Sakura/Community/9eSIM 集合一致。实际 manifest 是 1.1.3 / 408，包名 `ee.nekoko.nlpa1`。
- APK 61,799,513 字节，SHA-256 `716d4e6834fcdf233558c8990a5a3c273c58e734f64d67d6f9a5f9a2c8e19e1f`，与 Release API 的目标提交、大小和哈希一致。正式 bundle 无 `QL_UI_FIXTURE_ONLY`。
- [UI 截图与详细边界](releases/1.1.3-ui-checks.md)：深浅色、长名称与大字体布局通过；Android 14 浅色状态栏不再黑底深字；全部投递失败时显示失败且保留通知。
- 七项用户指定问题的源码复核/补漏和通知显示修复完成。当前待办为用户真机回归，不能以模拟器/构建代替真机读卡、切换或运营商下载反馈；依赖治理与 iOS 不属于本轮。

## 2026-11-07 · 用户真机反馈与审查余项复核

- 用户在 1.1.3 发布后反馈：“真机测试没啥问题”。登记当前使用中未发现异常，不扩大为所有硬件/运营商/异常路径测试通过。
- 对照原 2026-11-06 审查、1.1.1–1.1.3 改动和当前源码：A1–A10 均有对应修复；A3 请求异常有明确结束和时限、A8 已移除展示时自动昵称写卡、A9 写操作不再盲目重放。memo、图标缓存和重复 react-dom 也已处理。
- 尚待依赖公告可达性与升级治理、Actions 固定 SHA/发布来源证明、类型与中文/权限整理；iOS CustomHttp.swift 仍关闭 TLS 校验，不影响已发布 Android 包。G+D 兼容根 2027-05-10 到期前需复核更新。
- [当前后续清单](reviews/2026-11-07-follow-up.md)。本次仅文档更新，不重新构建 APK。

## 2026-11-07 · 1.1.4 实施与本地验证

已按用户要求处理依赖、发布来源、类型/中文/权限，排除 iOS；G+D 续期上游暂缺，新增安全生命周期处理。TypeScript、23 套件 167 项 Jest 通过；npm 957 个包名复扫仅 deepmerge 4.3.1 的已补丁命中，补丁字节和行为验证通过。尚未将这些本地结果记为 Android 构建、Maven 扫描或真机通过；待当前 CI 生成记录。

首轮 [42323623768](https://github.com/meetjor/NekokoLPA/actions/runs/42323623768) 的 TypeScript/167 Jest/npm 审计通过；Gradle init 脚本也被应用到 RN 附属插件构建，因不存在 :app 而失败。已添加项目筛选与未解析依赖拒绝规则，并显式重跑 postinstall 保证缓存恢复后补丁生效。此次未生成/发布 APK，不改变版本号。

第二轮 [42323941504](https://github.com/meetjor/NekokoLPA/actions/runs/42323941504) 成功解析 156 项 Android Maven 依赖，OSV 检出 Okio 2.9.0 / CVE-2023-3635，按关卡设计阻止发布。定向使用与 Okio 2.x JVM API 二进制兼容的 3.6.0，并加入畸形 GZIP FEXTRA 无符号长度回归；待下一轮验证实际解析版本。未回避或忽略该公告。

Okio 3.6.0 与 okio-jvm 的 OSV 查询均无命中。Android 集成与 TLS 测试仍由下一轮 CI 确认。

已完成隔离回归：同一 Java 字节码（以旧 Okio 编译）和同一合成 GZIP，Okio 2.9.0 抛 IllegalArgumentException，3.6.0 抛预期 EOFException。验证新版二进制兼容及该异常修复；不替代 Android 集成检查。
