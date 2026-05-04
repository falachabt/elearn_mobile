import { getApp } from '@react-native-firebase/app'
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth'

export type PhoneConfirmation = {
  confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } }>
}

export async function sendPhoneOtp(phoneE164: string): Promise<PhoneConfirmation> {
  const auth = getAuth(getApp())
  const confirmation = await signInWithPhoneNumber(auth, phoneE164)

  return {
    confirm: async (code: string) => {
      const credential = await confirmation.confirm(code)
      if (!credential?.user) {
        throw new Error('Phone verification failed')
      }

      return {
        user: {
          getIdToken: () => credential.user.getIdToken(),
        },
      }
    },
  }
}
