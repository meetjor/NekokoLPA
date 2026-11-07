package ee.nekoko.nlpa

import java.io.IOException
import okio.Buffer
import okio.GzipSource
import java.util.Date
import java.security.cert.CertificateException
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import okhttp3.tls.HandshakeCertificates
import okhttp3.tls.HeldCertificate
import org.junit.Assert.*
import org.junit.Test

class RspHttpClientTest {
    private val ca = HeldCertificate.Builder().certificateAuthority(1).commonName("Test only CA").build()
    private fun leaf(host: String = "localhost", expired: Boolean = false): HeldCertificate {
        val builder = HeldCertificate.Builder().commonName(host).addSubjectAlternativeName(host).signedBy(ca)
        if (expired) builder.validityInterval(0L, 1000L)
        return builder.build()
    }
    private fun trustedClient(): OkHttpClient = RspHttpClient.createClient(
        HandshakeCertificates.Builder().addTrustedCertificate(ca.certificate).build().trustManager
    )
    private fun request(url: String, client: OkHttpClient): String {
        val events = LinkedBlockingQueue<String>()
        RspHttpClient.send(url, "{}", { events.add("ok:$it") }, { code, _ -> events.add(code) }, client)
        val result = events.poll(5, TimeUnit.SECONDS) ?: error("Promise did not settle")
        assertNull("Callback settled twice", events.poll(50, TimeUnit.MILLISECONDS))
        return result
    }
    private fun server(cert: HeldCertificate, response: MockResponse, block: (MockWebServer) -> Unit) {
        MockWebServer().use { server ->
            val tls = HandshakeCertificates.Builder().heldCertificate(cert, ca.certificate).build()
            server.useHttps(tls.sslSocketFactory(), false)
            server.enqueue(response)
            server.start()
            block(server)
        }
    }
    @Test fun trustedServerSucceeds() = server(leaf(), MockResponse().setBody("{}")) {
        assertEquals("ok:{}", request(it.url("/").toString(), trustedClient()))
    }
    @Test fun wrongHostnameFails() = server(leaf("wrong.example"), MockResponse().setBody("{}")) {
        assertEquals("TLS_CERTIFICATE_ERROR", request(it.url("/").toString(), trustedClient()))
    }
    @Test fun expiredCertificateFails() = server(leaf(expired = true), MockResponse().setBody("{}")) {
        assertEquals("TLS_CERTIFICATE_ERROR", request(it.url("/").toString(), trustedClient()))
    }
    @Test fun untrustedCertificateFailsWithProductionTrust() = server(leaf(), MockResponse().setBody("{}")) {
        assertEquals("TLS_CERTIFICATE_ERROR", request(it.url("/").toString(), RspHttpClient.createClient(RspHttpClient.productionTrustManager())))
    }
    @Test fun truncatedBodySettlesAsError() = server(leaf(), MockResponse().setBody("x".repeat(8192)).setSocketPolicy(SocketPolicy.DISCONNECT_DURING_RESPONSE_BODY)) {
        assertEquals("RESPONSE_ERROR", request(it.url("/").toString(), trustedClient()))
    }
    @Test fun redirectsAreRejected() = server(leaf(), MockResponse().setResponseCode(302).setHeader("Location", "https://other.example/")) {
        assertEquals("HTTP_302", request(it.url("/").toString(), trustedClient()))
        assertEquals(1, it.requestCount)
    }
    @Test fun malformedAndCleartextUrlsSettle() {
        assertEquals("REQUEST_ERROR", request("not a URL", trustedClient()))
        assertEquals("REQUEST_ERROR", request("http://localhost/", trustedClient()))
    }
    @Test fun oversizedResponseRejected() = server(leaf(), MockResponse().setHeader("Content-Length", 16777217)) {
        assertEquals("RESPONSE_ERROR", request(it.url("/").toString(), trustedClient()))
    }
    @Test fun productionRootsPresent() {
        val subjects = RspHttpClient.productionTrustManager().acceptedIssuers.map { it.subjectX500Principal.name }
        assertTrue(subjects.any { it.contains("GSM Association - RSP2 Root CI1") })
        // G+D compatibility root expires 2027-05-10 and is then deliberately omitted.
    }
    @Test fun cachedTrustRejectsAnchorAfterExpiryEvenWhenServerOmitsRoot() {
        val start = System.currentTimeMillis()
        val root = HeldCertificate.Builder().certificateAuthority(1).commonName("Short lived CA")
            .validityInterval(start - 60000L, start + 60000L).build()
        val cert = HeldCertificate.Builder().commonName("localhost").signedBy(root)
            .validityInterval(start - 60000L, start + 3600000L).build().certificate
        val unrelatedSystem = HandshakeCertificates.Builder().addTrustedCertificate(ca.certificate).build().trustManager
        var clock = Date(start)
        val trust = RspHttpClient.trustManager(unrelatedSystem, listOf(root.certificate)) { clock }
        trust.checkServerTrusted(arrayOf(cert), "EC")
        clock = Date(start + 120000L)
        assertFalse(trust.acceptedIssuers.contains(root.certificate))
        try {
            trust.checkServerTrusted(arrayOf(cert), "EC")
            fail("Expired compatibility root must not authorize new handshakes")
        } catch (_: CertificateException) { }
    }

    @Test fun expiredCompatibilityRootDoesNotDisableOtherRootsOrSystemTrust() {
        val expired = HeldCertificate.Builder().certificateAuthority(1).commonName("Expired CA")
            .validityInterval(0L, 1000L).build().certificate
        val trusted = HandshakeCertificates.Builder().addTrustedCertificate(ca.certificate).build().trustManager
        val chain = arrayOf(leaf().certificate)
        RspHttpClient.trustManager(trusted, listOf(expired)).checkServerTrusted(chain, "EC")
        val unrelated = HeldCertificate.Builder().certificateAuthority(1).commonName("Unrelated CA").build()
        val system = HandshakeCertificates.Builder().addTrustedCertificate(unrelated.certificate).build().trustManager
        RspHttpClient.trustManager(system, listOf(expired, ca.certificate)).checkServerTrusted(chain, "EC")
    }
    @Test fun malformedGzipExtraLengthFailsAsIoError() {
        // GZIP FEXTRA with unsigned XLEN=32768 and missing payload.
        // Vulnerable Okio 2.x treats XLEN as negative and leaks IllegalArgumentException.
        val bytes = "1f8b08040000000000ff0080".chunked(2).map { it.toInt(16).toByte() }.toByteArray()
        GzipSource(Buffer().write(bytes)).use { source ->
            assertThrows(IOException::class.java) { source.read(Buffer(), 1L) }
        }
    }
}
