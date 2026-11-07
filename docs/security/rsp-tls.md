# Android RSP HTTPS trust · 1.1.1

`RspHttpClient.kt` replaces the previous empty trust manager and always-true hostname verifier. It verifies the certificate chain, validity and hostname using Android trust and an explicit production RSP trust store. Redirects and automatic HTTP replay are disabled. Requests require HTTPS; connection/read/write timeouts are 30 s and the entire call is limited to 120 s. A response is limited to 16 MiB. Invalid URLs, truncated bodies and oversized replies reject the JS promise with non-sensitive error categories.

## Bundled production roots

The PEM files are copied exactly from the ChromiumOS Hermes production trust store, retrieved 2026-11-06. No test root or private key is included.

| File | Primary source blob | SHA-256 of DER certificate | Expiry |
| --- | --- | --- | --- |
| `gsma-ci.pem` | [Chromium gsma-ci.pem](https://chromium.googlesource.com/chromiumos/platform2/+/HEAD/hermes/certs/prod/gsma-ci.pem), blob `d9b71137dec7520bb5230c5ec8baa33feb32ef2b` | `5e3e91fd454327c3af5d32a7a73bbc59fe43aa7d85fd32d5db44423f80a56bb3` | 2052-02-21 |
| `gd-smdp.pem` | [Chromium gd-smdp.pem](https://chromium.googlesource.com/chromiumos/platform2/+/HEAD/hermes/certs/prod/gd-smdp.pem), blob `e31531b0cf2dbf29e0f1dab6aade3ec972066c35` | `2ce2d6787f3b6411b89e675e7eb3e87f88179bf5b08a6ec78d95a6167700c78b` | 2027-05-10 |

[Hermes trust-store rationale](https://chromium.googlesource.com/chromiumos/platform2/+/HEAD/hermes/certs/README.md) distinguishes production and test roots. [GSMA's CI listing](https://www.gsma.com/solutions-and-impact/technologies/esim/gsma-root-ci/) also lists WISeKey: it has **not** been added here because its production certificate provenance/compatibility still needs review. Other proprietary or test CIs will fail closed unless their chain is already trusted by Android. Do not restore trust-all to make such a service work. Add any future root through a reviewed source/fingerprint update and compatibility tests.

At initialization expired bundled roots are omitted. In particular, review the G+D compatibility root before May 2027. Root updates ship with app updates; this code does not download trust anchors. This is ordinary platform chain validation, not a new OCSP/CRL revocation implementation and not complete SGP.22 certification.

The three public APK signers (Sakura / Community / 9eSIM) remain unchanged. They authorize installation and card access; they do not replace HTTPS server validation.

## Tests and limits

`RspHttpClientTest` uses local synthetic servers/certificates: trusted, untrusted, wrong hostname, expired, redirect, invalid/cleartext URL, body truncation, oversized body, and production-root loading. Tests do not send a real activation code or install/delete a card profile. The mocked trusted-CA test proves the validator path, not possession of a production root's signing key. Real operator downloads and Android-specific certificate/provider behavior remain device checks.

This release targets Android. The legacy `ios/CustomHttp.swift` implementation has not been hardened or released as part of this work; do not advertise cross-platform TLS remediation.

## 1.1.4：有效期与兼容维护

2026-11-07 复核 ChromiumOS Hermes 生产目录，上游 `gd-smdp.pem` 仍与本仓库一致，截止时间为 **2027-05-10 00:00 UTC**，尚无已核验的替换证书。应用不能为第三方 CA 续期，不能修改证书日期、信任任意新根或跳过链/域名校验。APK 三签也不能解决 HTTPS CA 到期。

- `RspHttpClient.trustManager` 按每枚兼容根建立独立信任管理器，每次新 TLS 握手重新检查根有效期，包含服务器未发送根的情况。应用缓存的客户端不能绕过有效期检查；系统信任独立存在，一枚过期根不会拖累其他有效根。
- HTTPS 校验/握手错误返回不含服务器 URL 或激活标识的 `TLS_CERTIFICATE_ERROR`，下载页显示检查系统日期、升级应用、联系运营商更新链的中文提示。该提示不表示一定是根过期，域名/未知 CA/协议问题也可能触发。
- `docs/security/rsp-roots.json` 固定来源、DER SHA-256 和有效期；`yarn security:roots` 每次构建校验指纹、自签 CA 与有效期，剩余 ≤180 天警告、≤90 天阻止新发布。它只在执行构建/本地检查时运行，不宣称已部署定时监控。
- 后续替换流程：从 CA/可信维护方获取生产证书 → 核对指纹、用途、链和有效期 → 更新 PEM 与清单/打包指纹断言 → 原生正反向 TLS 测试 → 有正常下载需求时真机验证 → 新版三签发布。若没有可信替代，可审查后明确退役兼容根；不得静默关闭校验。
- 系统已信任的新证书链可以直接工作，但仍使用此旧根的服务需要发行方迁移。**到期后兼容所有运营商并未解决，也不能承诺。**
