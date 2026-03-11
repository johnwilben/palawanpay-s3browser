const awsconfig = {
  Auth: {
    Cognito: {
      userPoolId: 'ap-southeast-1_ieR5X01hf',
      userPoolClientId: '504f5m01uepjpq2d0v4i8ceh15',
      loginWith: {
        oauth: {
          domain: 's3browser-721010870103.auth.ap-southeast-1.amazoncognito.com',
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: ['https://feature-cross-account-access.d32el4qcx14shm.amplifyapp.com/', 'http://localhost:3000/'],
          redirectSignOut: ['https://feature-cross-account-access.d32el4qcx14shm.amplifyapp.com/', 'http://localhost:3000/'],
          responseType: 'code'
        }
      }
    }
  },
  API: {
    REST: {
      S3BrowserAPI: {
        endpoint: 'https://9th34ei7t8.execute-api.ap-southeast-1.amazonaws.com/prod',
        region: 'ap-southeast-1'
      }
    }
  }
};

export default awsconfig;
