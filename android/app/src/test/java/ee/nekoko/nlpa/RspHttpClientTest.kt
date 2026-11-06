package ee.nekoko.nlpa

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
        assertEquals("NETWORK_ERROR", request(it.url("/").toString(), trustedClient()))
    }
    @Test fun expiredCertificateFails() = server(leaf(expired = true), MockResponse().setBody("{}")) {
        assertEquals("NETWORK_ERROR", request(it.url("/").toString(), trustedClient()))
    }
    @Test fun untrustedCertificateFailsWithProductionTrust() = server(leaf(), MockResponse().setBody("{}")) {
        assertEquals("NETWORK_ERROR", request(it.url("/").toString(), RspHttpClient.createClient(RspHttpClient.productionTrustManager())))
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
}
