const config = {
  Auth: {
    Cognito: {
      userPoolId: 'ap-southeast-1_XXXXXXXXX',
      userPoolClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
      identityPoolId: 'ap-southeast-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
      loginWith: {
        oauth: {
          domain: 'palawanpay-s3browser.auth.ap-southeast-1.amazoncognito.com',
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: ['http://localhost:3000/', 'https://main.XXXXXX.amplifyapp.com/'],
          redirectSignOut: ['http://localhost:3000/', 'https://main.XXXXXX.amplifyapp.com/'],
          responseType: 'code'
        }
      }
    }
  },
  API: {
    REST: {
      S3BrowserAPI: {
        endpoint: 'https://XXXXXXXXXX.execute-api.ap-southeast-1.amazonaws.com/prod',
        region: 'ap-southeast-1'
      }
    }
  }
};

export default config;
