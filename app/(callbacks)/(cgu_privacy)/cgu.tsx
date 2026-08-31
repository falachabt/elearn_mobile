import LegalDocumentScreen from "@/components/shared/legal/LegalDocumentScreen";

const CGU_URL = "https://elearnprepa.com/en/privacy/cgu";
const PAGE_TITLE = "Conditions Générales d'Utilisation";

export default function CGUScreen() {
  return <LegalDocumentScreen title={PAGE_TITLE} url={CGU_URL} />;
}
