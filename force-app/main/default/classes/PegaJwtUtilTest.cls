@isTest private class PegaJwtUtilTest {
    @isTest static void testAccessToken() {
        // Set mock callout class
        Test.setMock(HttpCalloutMock.class, new MockPegaHttpResponse());
        String accesToken = PegaJwtUtil.generateJWT('https://example.com', 'user@example.com');
    }
}