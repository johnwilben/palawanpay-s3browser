const awsconfig = {
  aws_project_region: 'ap-southeast-1',
  aws_cognito_region: 'ap-southeast-1',
  aws_user_pools_id: 'ap-southeast-1_ieR5X01hf',
  aws_user_pools_web_client_id: '504f5m01uepjpq2d0v4i8ceh15',
  oauth: {
    domain: 's3browser-721010870103.auth.ap-southeast-1.amazoncognito.com',
    scope: ['openid', 'email', 'profile'],
    redirectSignIn: [
      'https://feature-cross-account-access.d32el4qcx14shm.amplifyapp.com/',
      'http://localhost:3000/'
    ],
    redirectSignOut: [
      'https://feature-cross-account-access.d32el4qcx14shm.amplifyapp.com/',
      'http://localhost:3000/'
    ],
    responseType: 'code'
  }
};

export default awsconfig;
