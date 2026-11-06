package ee.nekoko.nlpa

import java.io.IOException
import java.security.KeyStore
import java.security.cert.CertificateException
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response

/** HTTPS trust is independent of the APK certificates used for card access. */
internal object RspHttpClient {
    private const val MAX_RESPONSE_BYTES = 16L * 1024 * 1024
    private val json = "application/json; charset=utf-8".toMediaType()
    private val client: OkHttpClient by lazy { createClient(productionTrustManager()) }

    private fun manager(store: KeyStore?): X509TrustManager =
        TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm()).apply {
            init(store)
        }.trustManagers.filterIsInstance<X509TrustManager>().single()

    internal fun productionTrustManager(): X509TrustManager {
        val roots = KeyStore.getInstance(KeyStore.getDefaultType()).apply { load(null) }
        val factory = CertificateFactory.getInstance("X.509")
        for (name in listOf("gsma-ci", "gd-smdp")) {
            val certificate = RspHttpClient::class.java.getResourceAsStream("/rsp/$name.pem")
                ?.use { factory.generateCertificate(it) as X509Certificate }
                ?: throw IllegalStateException("Missing RSP trust root")
            // Expired compatibility roots must stop authorizing connections.
            try {
                certificate.checkValidity()
                roots.setCertificateEntry(name, certificate)
            } catch (_: CertificateException) { }
        }
        val delegates = listOf(manager(null), manager(roots))
        return object : X509TrustManager {
            override fun getAcceptedIssuers(): Array<X509Certificate> =
                delegates.flatMap { it.acceptedIssuers.toList() }.toTypedArray()

            override fun checkClientTrusted(chain: Array<out X509Certificate>, authType: String) {
                throw CertificateException("Client certificates are not supported")
            }

            override fun checkServerTrusted(chain: Array<out X509Certificate>, authType: String) {
                if (chain.isEmpty()) throw CertificateException("Empty server certificate chain")
                chain.forEach { it.checkValidity() }
                for (delegate in delegates) {
                    try {
                        delegate.checkServerTrusted(chain, authType)
                        return
                    } catch (_: CertificateException) { }
                }
                throw CertificateException("Untrusted RSP server certificate")
            }
        }
    }

    internal fun createClient(trust: X509TrustManager): OkHttpClient {
        val tls = SSLContext.getInstance("TLS").apply { init(null, arrayOf(trust), null) }
        return OkHttpClient.Builder()
            .sslSocketFactory(tls.socketFactory, trust)
            // Keep OkHttp's strict hostname verifier. Never trust a mismatched SAN.
            .followRedirects(false)
            .followSslRedirects(false)
            .retryOnConnectionFailure(false)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .callTimeout(120, TimeUnit.SECONDS)
            .build()
    }

    internal fun send(
        url: String,
        body: String,
        resolve: (String) -> Unit,
        reject: (String, String) -> Unit,
        http: OkHttpClient? = null,
    ) {
        try {
            val request = Request.Builder().url(url)
                .post(body.toRequestBody(json))
                .header("Accept", "application/json")
                .header("User-Agent", "gsma-rsp-lpad")
                .header("X-Admin-Protocol", "gsma/rsp/v2.2.0")
                .build()
            require(request.url.isHttps) { "HTTPS is required" }
            require(request.url.username.isEmpty() && request.url.password.isEmpty()) { "URL credentials are not allowed" }
            (http ?: client).newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    // Exception text may contain activation IDs or server URLs.
                    reject("NETWORK_ERROR", "Secure request failed or timed out")
                }

                override fun onResponse(call: Call, response: Response) {
                    val text: String
                    try {
                        text = response.use {
                            if (!it.isSuccessful) {
                                reject("HTTP_${it.code}", "Server returned HTTP ${it.code}")
                                return
                            }
                            val content = it.body ?: throw IOException("Missing response")
                            if (content.contentLength() > MAX_RESPONSE_BYTES) throw IOException("Response too large")
                            val source = content.source()
                            if (source.request(MAX_RESPONSE_BYTES + 1)) throw IOException("Response too large")
                            content.string()
                        }
                    } catch (_: Exception) {
                        reject("RESPONSE_ERROR", "Server response could not be read completely")
                        return
                    }
                    resolve(text)
                }
            })
        } catch (_: Exception) {
            reject("REQUEST_ERROR", "Unable to start secure request")
        }
    }
}
