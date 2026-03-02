const config = {
  Auth: {
    Cognito: {
      userPoolId: 'ap-southeast-1_YdUsCa38i',
      userPoolClientId: '67sai9k433mpqs87f34im74prt',
      identityPoolId: 'ap-southeast-1:6728d3e2-e8bc-416b-9d9d-c8d7a1028881',
      loginWith: {
        oauth: {
          domain: 'palawanpay-s3browser.auth.ap-southeast-1.amazoncognito.com',
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: ['http://localhost:3000/', 'https://main.d3v8example.amplifyapp.com/'],
          redirectSignOut: ['http://localhost:3000/', 'https://main.d3v8example.amplifyapp.com/'],
          responseType: 'code'
        }
      }
    }
  },
  API: {
    REST: {
      S3BrowserAPI: {
        endpoint: 'https://c9bc3h6l94.execute-api.ap-southeast-1.amazonaws.com/prod',
        region: 'ap-southeast-1'
      }
    }
  }
};

export default config;
