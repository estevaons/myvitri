import { Link } from "@/lib/i18n/navigation";
import { LegalPage, Section } from "@/components/home/LegalPage";
import { BRAND, CONTACT_EMAIL, HOST } from "@/lib/brand";

/**
 * Privacy Policy em inglês: tradução da versão em português (PrivacyPt), que é a que vale.
 * Qualquer mudança na política entra nas duas, na mesma data.
 */

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export function PrivacyEn({ updated }: { updated: string }) {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={updated}
      intro={
        <>
          <p className="m-0">
            {BRAND} ({HOST}) is a platform where anyone can build a public storefront with the discount coupons and products they recommend.
            This policy explains what data we collect, why, who we share it with and how you control your data, in accordance with
            Brazil&apos;s General Data Protection Law (Law No. 13,709/2018, LGPD).
          </p>
          <p className="m-0 mt-4 text-[15px] text-mute">
            This is an English translation provided for convenience. If there is any difference between versions, the{" "}
            <Link href="/privacidade" locale="pt-BR">
              Portuguese version
            </Link>{" "}
            prevails.
          </p>
        </>
      }
    >
      <Section title="1. Who is responsible">
        <p>
          {BRAND} is the controller of the data processed on this site. For any matter about your data, including contacting our data
          protection officer (DPO), write to {mail}.
        </p>
      </Section>

      <Section title="2. Data we collect">
        <p>
          <strong>Storefront creators (Google sign-in).</strong> When you sign in with your Google account, we receive only your name, email
          address and profile photo (the <em>openid</em>, <em>email</em> and <em>profile</em> permissions). We do not access your Gmail, your
          contacts, your Google Drive or any other data in your Google account.
        </p>
        <p>
          <strong>Accounts created with email and password.</strong> We receive your name and email, which we also use to confirm the account
          and send new-password links. Your password is stored encrypted by Supabase, and no one at {BRAND} can read it.
        </p>
        <p>
          <strong>Storefront content.</strong> The display name, chosen link, photo, texts, coupons, products, store and affiliate links and
          kits you add. This content is meant to be public and is shown to anyone who opens your storefront.
        </p>
        <p>
          <strong>Storefront visitors.</strong> We count visits and clicks (for example, “coupon copied” or “click to go to the store”) to show
          metrics to the storefront owner. Each record stores only the event type, the item clicked and the date and time. We do not store
          name, email, IP address or any personal identifier with these events.
        </p>
        <p>
          <strong>People who save storefronts or comment.</strong> The same sign-in data. The list of saved storefronts is private. Comments
          are public: the text appears on the storefront with the date, your name and, if you sign in with Google, your profile photo, to anyone
          who opens the page. You can delete your comments at any time, and the storefront owner can also delete the ones on it.
        </p>
        <p>
          <strong>Technical logs.</strong> Our hosting providers may log, for a short time, data such as IP address, browser and pages
          visited, for security and to fix errors.
        </p>
      </Section>

      <Section title="3. How we use data">
        <ul>
          <li>To create and maintain your account, identify you at sign-in and protect access to the editor (performance of contract).</li>
          <li>To fill in your storefront photo with your Google photo, which you can change or remove at any time.</li>
          <li>To publish your storefront and show you visit and click metrics (performance of contract).</li>
          <li>To keep your saved storefronts and publish your comments with your name and photo (performance of contract).</li>
          <li>To contact you about your account, important changes to the service or requests you make (legitimate interest).</li>
          <li>To keep the site secure, prevent abuse and comply with legal obligations.</li>
        </ul>
        <p>We do not sell your data, we do not use it for advertising and we do not profile storefront visitors.</p>
      </Section>

      <Section title="4. Data received from Google">
        <p>
          The use and transfer to any other app of information received from Google APIs adheres to the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. We use name, email and photo only for the purposes described above. This data is not sold,
          not used for advertising, not read by humans (except with your permission, for security or to comply with the law) and not used to
          train artificial intelligence models.
        </p>
      </Section>

      <Section title="5. Cookies and browser storage">
        <ul>
          <li>Session cookies, needed to keep you signed in to the editor.</li>
          <li>
            Temporary cookies that store the chosen link (up to 10 minutes, while you sign in) and the page to return to (up to 1 hour, for the
            new-password link).
          </li>
          <li>A cookie that remembers the site language you last chose (up to 1 year).</li>
          <li>An entry in the browser session so the same visit is not counted twice; it disappears when the tab is closed.</li>
        </ul>
        <p>We do not use advertising cookies or third-party tracking tools.</p>
      </Section>

      <Section title="6. Who we share data with">
        <p>We share data only with companies that help us run the service, and only what is needed for that:</p>
        <ul>
          <li>
            <strong>Supabase</strong>: database and authentication.
          </li>
          <li>
            <strong>Vercel</strong>: site hosting.
          </li>
          <li>
            <strong>Google</strong>: sign-in with a Google account.
          </li>
          <li>
            <strong>Brave Search</strong>: when you import a product by link, we may look up the address or product name to complete the photo.
            None of your personal data is sent.
          </li>
        </ul>
        <p>
          Links to stores may carry campaign parameters (UTM) that identify the storefront they came from, never the visitor. We may also share
          data when required by law or a court order.
        </p>
      </Section>

      <Section title="7. International transfers">
        <p>
          Some providers store data on servers outside Brazil, such as in the United States. In those cases, we use companies that offer data
          protection safeguards compatible with the LGPD.
        </p>
      </Section>

      <Section title="8. How long we keep data">
        <p>
          We keep your account and storefront data for as long as the account exists. You can delete your account whenever you want in Settings
          (in your photo&apos;s menu, “Delete my account”): we immediately delete the account, the storefront, coupons, products, kits, draft,
          metrics, saved storefronts and the comments you wrote, and the link becomes available. If you prefer, request deletion at {mail} and we
          will do it within 15 days. Database backups and providers&apos; technical logs are deleted automatically within short periods. We only
          keep anything after that if the law requires it.
        </p>
      </Section>

      <Section title="9. Your rights">
        <p>Under the LGPD, you can at any time:</p>
        <ul>
          <li>confirm whether we process your data and request access to it;</li>
          <li>correct incomplete or outdated data (most of it can be edited directly in Settings and in the editor);</li>
          <li>delete your account and data yourself, in Settings (in your photo&apos;s menu, “Delete my account”);</li>
          <li>request data portability;</li>
          <li>find out who we share your data with;</li>
          <li>withdraw consent, when consent is the legal basis for processing.</li>
        </ul>
        <p>
          For other requests, write to {mail} from your account email. We reply within 15 days. You can also remove {BRAND}&apos;s access to your
          Google account at{" "}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
            myaccount.google.com/permissions
          </a>{" "}
          and, if you find it necessary, contact Brazil&apos;s National Data Protection Authority (ANPD).
        </p>
      </Section>

      <Section title="10. Security">
        <p>
          All traffic uses an encrypted connection (HTTPS). In the database, access rules ensure that only you can change your storefront and
          see your metrics. No system is completely immune to failures; if an incident affects your data, we will notify you and the ANPD as
          the law requires.
        </p>
      </Section>

      <Section title="11. Minors">
        <p>
          To create a storefront, save storefronts or comment, you must be 18 or older or have permission from a parent or guardian. Visiting
          storefronts does not require an account.
        </p>
      </Section>

      <Section title="12. Changes to this policy">
        <p>
          We may update this policy. The date at the top shows the version in effect and, if the change is significant, we will let you know
          by your account email. See also the <Link href="/termos">Terms of Use</Link>.
        </p>
      </Section>

      <Section title="13. Contact">
        <p>Privacy questions, requests or complaints: {mail}.</p>
      </Section>
    </LegalPage>
  );
}
