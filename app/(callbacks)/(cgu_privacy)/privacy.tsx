import LegalDocumentScreen from "@/components/shared/legal/LegalDocumentScreen";

const PRIVACY_URL = "https://elearnprepa.com/en/privacy";
const PAGE_TITLE = "Politique de Confidentialité";

export default function PrivacyScreen() {
  return <LegalDocumentScreen title={PAGE_TITLE} url={PRIVACY_URL} />;
}
