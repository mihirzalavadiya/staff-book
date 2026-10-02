import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Terms of Use · Staffbook" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="2 October 2026">
      <p>By using Staffbook you agree to these terms.</p>
      <h2>What Staffbook is</h2>
      <p>
        A tool to keep a shared daily attendance register and calculate monthly salary. It is a record-keeping aid, not
        an employment contract, payment service or legal advice. Salaries are paid by households directly.
      </p>
      <h2>Your responsibilities</h2>
      <ul>
        <li>Enter information honestly. Entries are kept as a history and cannot be erased.</li>
        <li>Share a worker&apos;s link only with that worker.</li>
        <li>Keep your login secure.</li>
      </ul>
      <h2>Availability</h2>
      <p>We work to keep Staffbook running, but it is provided as is and may sometimes be unavailable.</p>
      <h2>Changes</h2>
      <p>We may update these terms; the date above shows the latest version.</p>
    </LegalPage>
  );
}
