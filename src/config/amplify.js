import { Amplify } from 'aws-amplify'

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'eu-north-1_QZQwVTYfz',
      userPoolClientId: '3qv14r4s6hn3tbgsouigch1s5m',
      loginWith: {
        email: true,
      },
    },
  },
})

export default Amplify
