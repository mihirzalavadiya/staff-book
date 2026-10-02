import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy · Staffbook" };

const CONTACT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="2 October 2026">
      <p>
        Staffbook is a shared attendance register between a household and the people who work in it. This page explains
        what we collect, why, and what you can do about it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <b>Household account:</b> your email address, and your name and profile picture if you sign in with Google.
        </li>
        <li>
          <b>Home details you enter:</b> home name, your name, and optionally a locality or location.
        </li>
        <li>
          <b>Worker details you enter:</b> name, phone number, role, salary, working days and language.
        </li>
        <li>
          <b>The register:</b> attendance marks, leave, claims, disputes, voice-note length, advances and monthly
          settlements, each with who made it and when.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To show the same daily register and monthly salary to the household and the worker.</li>
        <li>To sign you in and keep your account secure.</li>
        <li>To send login codes, and reminders you have switched on.</li>
      </ul>
      <p>We do not sell your data, show ads, or share it with anyone for marketing.</p>

      <h2>Who can see it</h2>
      <ul>
        <li>A household sees only its own workers and their records.</li>
        <li>A worker, through their private link, sees only the houses they work in and their own records.</li>
        <li>Anyone holding a worker&apos;s link can act as that worker for that house, so share it only with them.</li>
      </ul>

      <h2>Where it is stored</h2>
      <p>
        Data is stored with Supabase (database and sign-in) in India (Mumbai) and the app is served by Vercel. Email is
        sent through our email provider. These services process data only to run Staffbook.
      </p>

      <h2>How long we keep it</h2>
      <p>
        The register is kept so that past months stay correct for both sides. When a household ends work with someone,
        their history is archived, not deleted. You can ask us to delete your account and its data at any time.
      </p>

      <h2>Google sign-in</h2>
      <p>
        If you choose Google sign-in, we receive only your name, email address and profile picture from Google, and use
        them only to sign you in. We do not access your Gmail, contacts, Drive or any other Google data.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Correct your home and worker details from the app&apos;s Settings and Workers screens.</li>
        <li>Ask for a copy of your data, or for your account to be deleted, by contacting us.</li>
      </ul>

      <h2>Contact</h2>
      <p>{CONTACT ? <>Write to us at <a className="font-bold text-coral" href={`mailto:${CONTACT}`}>{CONTACT}</a>.</> : "Contact us through the email address you received your login code from."}</p>
    </LegalPage>
  );
}
