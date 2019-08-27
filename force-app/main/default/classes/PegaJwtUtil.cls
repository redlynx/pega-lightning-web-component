public with sharing class PegaJwtUtil {
    @AuraEnabled(cacheable=true)
    public static String generateJWT(String sub) {
        String certificateName = 'your_sales_force_certificate_name';  
        String iss = 'client_id_from_pega';  
        String clientSecret= 'client_secret_from_pega';  
        String aud = 'https://your_pega_server/prweb/PRRestService/oauth2/v1/token';

        Auth.JWT jwt = new Auth.JWT();
        jwt.setAud(aud);
        jwt.setIss(iss);
        jwt.setSub(sub);
        jwt.setValidityLength(10000);
        String name = UserInfo.getFirstName() + ' ' + UserInfo.getLastName();
        jwt.setAdditionalClaims(new Map<String, Object>{'name' => name});
        Auth.JWS jws = new Auth.JWS(jwt, certificateName);
        String jwtToken = jws.getCompactSerialization();
        
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