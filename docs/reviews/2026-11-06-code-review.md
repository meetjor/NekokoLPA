# QianLesim 1.1.0 代码审查 · 2026-11-06

> 本文是修复前的历史审查，不能作为 1.1.3 仍存在全部问题的清单。当前修复及未完成事项见 [2026-11-07 复核](2026-11-07-follow-up.md)。

审查分支 `feature/qianlesim-v1`，远端和本地头均核实为 `9a252df207ce46856c4ddc0114023da176457517`。已发布应用源码为 `c7d7f5989b06578711380bdd75134169282db81b`，1.1.0 / 405。

用户本次明确反馈：“目前我实测可切换，没感受到问题”。这是 **1.1.0 的用户真机切换通过反馈**；没有据此补写覆盖安装、下载新配置、USB/BLE、多设备或断网测试通过。本轮任务为审查，应用源码、包名、三证书集合与 Release 均未修改。

## 结论与证据等级

正常读卡/切换路径已有用户反馈，仍存在联网安全与异常恢复缺陷。最优先是 HTTPS 信任校验和停用保护的一致性，不建议为代码整洁重写正常切换流程。

- **源码确认**：可从实际执行路径直接确定的行为；不表示在真机上触发过。
- **模拟复现**：使用仓库实际 TypeScript、替换硬件/原生模块和网络的隔离验证。未访问卡片、未发送真实删除命令。
- **风险待验证**：失联、断网或时序条件的实际影响还需要设备/模拟服务验证。
- P1：优先处理；P2：随后修复。不是 CVSS 评分，也不是所有场景下的影响等级。

## A1 · P1 · 下载 HTTPS 接受任意证书与域名

证据：[android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt:785](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt#L785)、[android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt:805](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt#L805)。`checkServerTrusted` 为空，`hostnameVerifier` 始终为 true，且客户端供全部 `sendHttpRequest` 调用使用。

**源码确认的安全缺陷。** 攻击者若能介入网络链路，就能冒充 HTTPS 对端、读取或修改传输层可见内容及干扰下载。eUICC 与服务器的协议级认证仍然存在，因此不能据此声称能任意解密 BPP、克隆 eSIM 或伪造可安装配置。主要影响下载、发现和通知联网路径；已安装配置的本地启用/停用并不经过此 HTTP 客户端。

修复方向：按所支持 RSP/证书规范建立明确可信根、有效期、证书链和服务身份校验；必要时对指定服务使用受控自定义根。不能简单改成“只信 Android 默认根”后假定所有运营商兼容，也不能为兼容性继续全局 trust-all。需要测试可信服务成功、自签/过期/错误主机失败、必要 CI 根和实际运营商下载兼容。HTTPS 信任与 APK 三签是两套机制；此修复无需更换三签。

参考：[Android Unsafe X509TrustManager](https://developer.android.com/privacy-and-security/risks/unsafe-trustmanager)、[Unsafe HostnameVerifier](https://developer.android.com/privacy-and-security/risks/unsafe-hostname)、[SGP.22 v2.2.2 §5.6 / §4.5.2.2](https://www.gsma.com/solutions-and-impact/technologies/esim/wp-content/uploads/2020/06/SGP.22-v2.2.2.pdf)。SGP.22 明确要求 TLS 证书验证失败时拒绝连接。源码中的兼容性注释不构成关闭验证的安全依据。

## A2 · P1 · 配置详情页绕过“停用保护”

证据：[src/features/main/ProfileRow.tsx:182](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/features/main/ProfileRow.tsx#L182)、[src/features/profile/ProfileScreen.tsx:84](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/features/profile/ProfileScreen.tsx#L84)。

**源码确认。** 首页卡片判断 OMAPI、简化模式和 `disableProtection`；详情页的“停用”直接调用 `adapter.disableProfileByIccId`，没有同一保护。因此默认保护开启时，从首页不能进行的停用，可以从详情页发起。

修复方向：统一用户操作策略及提示，各入口复用；区分“启用目标配置让卡片完成切换”和“直接停用当前配置”，避免误拦正常切换。添加首页/详情一致性测试。没有执行真实停用验证，不建议用唯一可用配置冒险测试。

## A3 · P2 · HTTP 响应读取异常可能让 Promise 无结果

证据：[android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt:722](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt#L722)、[android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt:745](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt#L745)。

`onResponse` 内直接 `response.body?.string()`，没有捕获读取失败；构造 URL 也位于异常处理之外。服务器已经返回响应头后若中断正文，异常不会经过这里的 `promise.reject`。OkHttp 的 `onFailure` 不应被当作应用回调内部抛出异常的兜底；实际表现可能是未完成的 JS Promise/Loading，甚至工作线程异常，需原生故障注入确认。当前 `makeLoading` 的 finally 只能处理已结束的 Promise。

修复方向：构造和正文读取分别 catch 并保证一次 resolve/reject；设置明确整次请求时限、响应大小限制和取消策略。不要把 `Promise.race` 超时作为硬件操作完成的证明。

## A4 · P2 · 已安装成功可能无法进入成功页

证据：[src/lpa/adapters/Adapter.ts:397](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/lpa/adapters/Adapter.ts#L397)、[src/features/download/ScannerAuthentication.tsx:123](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/features/download/ScannerAuthentication.tsx#L123)、[src/shared/utils/loading.ts:14](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/shared/utils/loading.ts#L14)。

**模拟复现**：令 `download_profile` 返回 success=true，然后 `get_profiles` 失败，`Adapter.downloadProfile` 整体抛出异常，丢失成功结果。

界面还会在 `confirmDownload` 之前等待 `processNotifications`；其列通知/最终读卡失败也会阻断跳转。单条通知 HTTP 失败在 dispatcher 中被捕获，不能把每次通知网络失败都说成必然触发此问题。`makeLoading` 只写日志，用户可能停留在确认页面并尝试重复下载。

修复方向：安装结果、后续刷新结果、通知投递结果分别返回和展示；安装成功但刷新/投递失败应明确提示，保留重试辅助操作，不能再次把安装当成未开始。

## A5 · P2 · 顶部刷新、设备可用性与连接恢复不一致

证据：[src/features/main/MainScreen.tsx:15](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/features/main/MainScreen.tsx#L15)、[src/lpa/deviceManager.ts:128](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/lpa/deviceManager.ts#L128)、[src/lpa/adapters/Adapter.ts:102](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/lpa/adapters/Adapter.ts#L102)、[src/lpa/adapters/Adapter.ts:134](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/lpa/adapters/Adapter.ts#L134)。

**4 个隔离检查均复现：**

1. 顶部刷新对现有设备只调用 `device.refresh()`；OMAPI 实现仅返回 available，不读取配置。下拉刷新则调用 `Adapter.refresh()`，两者真实行为不同。
2. 原生发现同一 SIM 从 unavailable 变成 available 后，`setupDevices` 保留旧 device 对象，`available` 仍为 false。
3. `Adapter.connect()` 在 already-connected 情况跳过 if，反而把 connected 清为 false 并返回 false。
4. `refresh()` 的读卡失败进入 initialize；若先前 connected=true，触发上述 connect 问题，初始化不执行读卡且调用无错误返回，旧状态仍在。

修复方向：拆清“发现设备”和“刷新数据”；更新现有设备发现信息；connect 幂等；恢复失败显式反馈，并保留最后已知数据的未确认标记。发布前复测 SIM REFRESH，防止破坏当前已通过的切换流程。

## A6 · P2 · 读卡器删除再连接后，dispatcher 引用旧 adapter

证据：[src/lpa/bridge/runtime.ts:23](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/lpa/bridge/runtime.ts#L23)、[src/lpa/bridge/runtime.ts:42](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/lpa/bridge/runtime.ts#L42)、[src/lpa/deviceManager.ts:121](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/lpa/deviceManager.ts#L121)。

**模拟复现**：旧 adapter 建立 dispatcher 后，从注册表移除；以相同 deviceId 建立新 adapter；新对象执行命令时仍调用旧对象的 transmit。原因是 dispatcher 永久按 deviceId 缓存且闭包捕获首次 adapter，移除设备时没有清理它。

USB/BLE 断开再连接或设备实例替换时更相关；不是已在用户 OMAPI 日常切换中复现的故障。移除时也未将旧 adapter.obsolete 设为 true，旧后台同步任务仍有写状态的风险。

修复方向：明确 dispose 生命周期，失效后台任务与会话，删除对应 dispatcher/设备状态；新实例建新通道。活跃下载会话不能被普通刷新随意销毁。

## A7 · P2 · 隐私模式覆盖不完整，发布代码保留敏感日志

证据：[android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt:267](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt#L267)、[android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt:272](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt#L272)、[android/app/src/main/java/im/nfc/ccid/Ccid.kt:154](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/android/app/src/main/java/im/nfc/ccid/Ccid.kt#L154)、[src/features/profile/ProfileScreen.tsx:363](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/features/profile/ProfileScreen.tsx#L363)。

**源码确认。** 原生读取 EID 时写出完整响应和 EID；USB CCID 发送函数写出完整消息载荷，无 debug 条件。Release 的 ProGuard 关闭，不能假定日志会被构建剔除。详情页直接展示完整 ICCID/昵称，不使用首页的隐私遮罩。

日志风险需要 logcat/调试权限、设备诊断收集或用户分享日志等条件；不声称普通第三方 App 在现代 Android 上能随便读取全部日志，也没有发现这些日志主动上传的证据。

修复方向：发布版只记录错误类别、长度、阶段和关联 ID；卡标识默认脱敏，禁止原始 APDU 日志。统一详情页隐私展示策略，复制原值作为明确的用户动作保留。

## A8 · P2 · 展示配置列表时自动写卡，缺少迁移边界

证据：[src/features/main/ProfileSelector.tsx:37](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/features/main/ProfileSelector.tsx#L37)。

**源码确认**：effect 检测昵称/名称以 `^abc` 形式结束就自动 `setNicknameByIccId`，没有迁移版本标记、明确用户动作或防重入。用户自己的名字也可能恰好匹配；每次 setNickname 会发布 profiles，触发新的 effect，多个待清理项时可能出现重入、busy 异常及 Loading 状态互相覆盖。重入实际时序需 UI 测试验证。

修复方向：显示格式化尽量只读；历史迁移限制到有明确来源的旧记录，使用一次性标记和独立串行任务，不在渲染 effect 中循环写卡。

## A9 · P2 · 写操作在结果不明时仍有重放路径

证据：[src/lpa/adapters/Adapter.ts:155](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/lpa/adapters/Adapter.ts#L155)、[android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt:368](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/android/app/src/main/java/ee/nekoko/nlpa/NekokoLPA.kt#L368)。

**模拟复现**：`delete_profile` 首次执行抛出“响应丢失”，Adapter 再次执行同一命令；只排除了 enable/disable。原生 transceive 又对 IOException / IllegalStateException / 6d00 重连并重发同一 APDU，包括状态改变指令。

可确认的是“发生重放”，不能据此声称会删除另一个配置或已造成卡损坏。写操作、分段下载和 GET RESPONSE 的重试语义不同；响应丢失时卡上可能已经执行。

修复方向：按操作阶段/幂等性制定策略；只读可重试，结果未知的写操作优先核实卡状态。需要真实异常链路验证，不能直接删除所有底层恢复逻辑。

## A10 · P2 · 通知全部发送失败仍显示全部成功

证据：[src/lpa/core/dispatcher.ts:71](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/lpa/core/dispatcher.ts#L71)、[src/features/notifications/NotificationsScreen.tsx:173](https://github.com/meetjor/NekokoLPA/blob/9a252df207ce46856c4ddc0114023da176457517/src/features/notifications/NotificationsScreen.tsx#L173)。

**模拟复现**：模拟每条通知 sendNotification 抛出离线异常，dispatcher 捕获后仍返回 result=0。界面随后固定显示“全部处理成功”。失败通知仍保留在卡上，未观察到失败后被删除的问题。

修复方向：返回成功/失败/保留数量，按真实结果反馈；单条失败不阻塞其他项这一设计可以保留。

## 依赖安全扫描

原始 `yarn npm audit --all --recursive --json` 的 quick 接口返回 HTTP 400，**不能把该命令失败当成没有漏洞**。随后读取本机已安装依赖树，向 npm 官方 `/-/npm/v1/security/advisories/bulk` 提交包名和版本，使用 semver 再匹配版本范围。

本次查询包含 1169 个包名，匹配 33 个包名、去重 111 条公告（官方严重度：critical 3 / high 68 / moderate 29 / low 11）。这只是本次安装树与公告库的版本匹配，不是 111 个已证实可攻击 APK 的漏洞。大量依赖处于 Babel、Metro、Expo CLI、调试或构建工具链，实际可达性还需要逐条确认，原生 Gradle 依赖不在此扫描覆盖范围。

机器可读结果见 [dependency-advisories.json](2026-11-06/dependency-advisories.json)，包括版本、公告及示例依赖链。示例：

- `form-data@3.0.2` 经 `react-native-ble-plx → expo → @expo/cli` 引入；[维护者公告 GHSA-fjxv-7rqg-78g4](https://github.com/form-data/form-data/security/advisories/GHSA-fjxv-7rqg-78g4) 对应版本命中。未证明 Android Release 中存在该漏洞的可利用请求链。
- `@babel/runtime@7.26.0` 命中[维护者公告 GHSA-968p-4wvh-cqc8](https://github.com/babel/babel/security/advisories/GHSA-968p-4wvh-cqc8)，需要特定正则转换和不可信 replacement 字符串条件；未证实当前业务可达。
- `cross-spawn@7.0.3` 等属于工具链治理事项。按依赖链做最小兼容升级，不直接执行 audit fix --force 或整体升级 React Native。

## 代码优化与补测建议

1. **补行为测试**：现有 11 个套件主要覆盖 LPA 协议/编码、分帧、工具函数。补 Adapter 生命周期、异常下载结果、保护策略、重复点击/后台刷新、通知统计，比继续增加纯快照更有价值。
2. **减少 any**：下载页 props、Adapter 返回值、导航参数使用明确的成功/失败/未确认联合类型；避免核心结果被后续步骤的异常遮住。
3. **UI 更新准确性**：ProfileRow 自定义 memo 比较只覆盖 ICCID、状态、昵称和同步标记，没有覆盖 profileName/provider/icon/owner 等实际渲染字段；刷新这些字段时存在旧显示风险。优先默认浅比较或完整且可测的比较策略，不盲目加 memo。
4. **图标缓存**：离线 catch 后仍在内存 loaded 记空对象，导致本会话可能不再重试；过期缓存后台刷新没有向已挂载行发通知。修复缓存错误状态和订阅即可，不影响卡操作。
5. **发布流程**：版本从 package.json 派生；编译前检查 release 标签是否存在；构建与发布权限分离、Actions 固定完整 SHA；保留三枚指纹强校验。现在硬编码标签会使误触发构建耗时后才在发布失败。
6. **清理低风险遗留项**：package.json 同时在 dependencies/devDependencies 声明不同 react-dom 版本；保留中文翻译完整性；只请求实际使用的权限。禁用 ProGuard 本身不是已证实漏洞，若启用需单独验证 RN/原生桥反射与体积收益。
7. **公开兼容签名的边界**：公开私钥用于卡访问兼容，不能提供项目作者独占的发布身份；不把它们当成泄露的私人凭据，也不为审查更换签名。可补发布来源证明/受保护发布链；SHA256 文件主要提供完整性校验，不能单独防御来源本身被替换。

## 本次验证与下一步

- TypeScript：通过。
- 现有 Jest：11 套件、111 测试通过。
- 隔离复现：8 个断言检查确认上述已有错误行为。仅在上述审查基线运行（1.1.1 修复后使用正式 Jest 回归，原断言不再适用）：`node docs/reviews/2026-11-06/reproduce.cjs "$PWD"`（先安装仓库依赖）。该脚本加载真实 TS、mock 硬件/网络，**不是修复后的通过标准**；修复后应把断言改成期望行为并转入正式测试。
- 未进行新 APK 编译或发布；没有改变应用代码和证书。
- 未进行真机断网/拔卡/停用/删除测试，没有使用真实激活码，没有执行真实卡删除。
- 优先安排：A1/A2 → A7/A4/A3 → A5/A6/A10 → A8/A9 分阶段硬件回归。依赖升级另行隔离，避免把功能、安全、工具链大改混成一个难回滚版本。
