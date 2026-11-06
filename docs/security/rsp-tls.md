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
