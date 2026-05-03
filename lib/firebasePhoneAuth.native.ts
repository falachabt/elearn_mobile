import { getApp } from '@react-native-firebase/app'
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth'

export type PhoneConfirmation = {
  confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } }>
}

export async function sendPhoneOtp(phoneE164: string): Promise<PhoneConfirmation> {
  const auth = getAuth(getApp())
  return await signInWithPhoneNumber(auth, phoneE164)
}
