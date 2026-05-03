import auth from '@react-native-firebase/auth'

export type PhoneConfirmation = {
  confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } }>
}

export async function sendPhoneOtp(phoneE164: string): Promise<PhoneConfirmation> {
  return await auth().signInWithPhoneNumber(phoneE164)
}
