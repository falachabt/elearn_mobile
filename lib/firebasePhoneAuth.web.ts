import { initializeApp, getApps } from 'firebase/app'
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyC3YGwDt9mB3OH4yqcceL_YV_oWwUnM6Mo',
  authDomain: 'elearn5.firebaseapp.com',
  projectId: 'elearn5',
  storageBucket: 'elearn5.firebasestorage.app',
  messagingSenderId: '308270925920',
  appId: '1:308270925920:web:032c13398f607b11d5db05',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const webAuth = getAuth(app)

export type PhoneConfirmation = {
  confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } }>
}

let verifier: RecaptchaVerifier | null = null

function getVerifier(): RecaptchaVerifier {
  if (verifier) {
    verifier.clear()
    verifier = null
  }
  let container = document.getElementById('firebase-recaptcha')
  if (!container) {
    container = document.createElement('div')
    container.id = 'firebase-recaptcha'
    document.body.appendChild(container)
  }
  verifier = new RecaptchaVerifier(webAuth, 'firebase-recaptcha', { size: 'invisible' })
  return verifier
}

export async function sendPhoneOtp(phoneE164: string): Promise<PhoneConfirmation> {
  try {
    const confirmation = await signInWithPhoneNumber(webAuth, phoneE164, getVerifier())
    return confirmation
  } catch (error) {
    verifier?.clear()
    verifier = null
    throw error
  }
}
