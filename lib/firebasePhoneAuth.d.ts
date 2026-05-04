export type PhoneConfirmation = {
  confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } }>;
};

export function sendPhoneOtp(phoneE164: string): Promise<PhoneConfirmation>;
