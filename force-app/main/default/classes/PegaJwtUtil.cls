public with sharing class PegaJwtUtil {
    @AuraEnabled(cacheable=true)
    public static String generateJWT(String sub, String url) {
        JWT_Settings__mdt jwtSetting = [
                SELECT Audience__c,
                    Certificate_Name__c,
                    Client_Secret__c,
                    Issuer__c
                FROM JWT_Settings__mdt
                WHERE Id__c = :url
            ];

        String certificateName = jwtSetting.Certificate_Name__c;
        String iss = jwtSetting.Issuer__c;
        String clientSecret= jwtSetting.Client_Secret__c;
        String aud = jwtSetting.Audience__c;

        Auth.JWT jwt = new Auth.JWT();
        jwt.setAud(aud);
        jwt.setIss(iss);
        jwt.setSub(sub);
        jwt.setValidityLength(10000);
        String name = UserInfo.getFirstName() + ' ' + UserInfo.getLastName();
        jwt.setAdditionalClaims(new Map<String, Object>{'name' => name});
        Auth.JWS jws = new Auth.JWS(jwt, certificateName);
        String jwtToken = '';
        if (!Test.isRunningTest()) {
            jwtToken = jws.getCompactSerialization();
        }
        
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint(aud);
        request.setMethod('POST');
        request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        String body = 'client_id=' + iss 
            + '&client_secret=' + clientSecret
            + '&grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer'
            + '&assertion=' + jwtToken;
        request.setBody(body);
        HttpResponse response = http.send(request);
        if (response.getStatusCode() == 200) {
            String responseBody = response.getBody();
            JSONParser parser = JSON.createParser(responseBody);
            while (parser.nextToken() != null) {
            	if ((parser.getCurrentToken() == JSONToken.FIELD_NAME) && (parser.getText() == 'access_token')) {
                    parser.nextToken();
                    return parser.getText();
                }
			}
        }
        System.debug('The status code returned was not expected: ' + response.getStatusCode() + ' ' + response.getStatus());
        throw new CalloutException('Couldn\'t obtain access token');
    }
}