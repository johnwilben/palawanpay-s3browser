const config = {
  Auth: {
    Cognito: {
      userPoolId: 'ap-southeast-1_YdUsCa38i',
      userPoolClientId: '19lg9i63etaa6322ml0jv0clqu',
      identityPoolId: 'ap-southeast-1:6728d3e2-e8bc-416b-9d9d-c8d7a1028881',
      loginWith: {
        oauth: {
          domain: 'palawanpay-s3browser.auth.ap-southeast-1.amazoncognito.com',
          scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
          redirectSignIn: ['https://feature-cross-account-access.drm7arslkowgf.amplifyapp.com/', 'https://main.drm7arslkowgf.amplifyapp.com/', 'http://localhost:3000/'],
          redirectSignOut: ['https://feature-cross-account-access.drm7arslkowgf.amplifyapp.com/', 'https://main.drm7arslkowgf.amplifyapp.com/', 'http://localhost:3000/'],
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
