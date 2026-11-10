import { Link } from "@/lib/i18n/navigation";
import { LegalPage, Section } from "@/components/home/LegalPage";
import { BRAND, CONTACT_EMAIL, HOST } from "@/lib/brand";

/**
 * Terms of Use em inglês: tradução da versão em português (TermsPt), que é a que vale.
 * Qualquer mudança nos termos entra nas duas, na mesma data.
 */

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export function TermsEn({ updated }: { updated: string }) {
  return (
    <LegalPage
      title="Terms of Use"
      updated={updated}
      intro={
        <>
          <p className="m-0">
            These terms apply to anyone who uses {BRAND} ({HOST}), whether to create a storefront or to visit one. By using the site, you
            agree to them and to our <Link href="/privacidade">Privacy Policy</Link>.
          </p>
          <p className="m-0 mt-4 text-[15px] text-mute">
            This is an English translation provided for convenience. If there is any difference between versions, the{" "}
            <Link href="/termos" locale="pt-BR">
              Portuguese version
            </Link>{" "}
            prevails.
          </p>
        </>
      }
    >
      <Section title="1. What MyVitri is">
        <p>
          {BRAND} lets anyone build a public storefront, with its own link, gathering the discount coupons, products and outfits they
          recommend. Visitors can copy coupons and go on to the brand&apos;s store. The service is currently free; if any feature becomes
          paid, we will let you know in advance.
        </p>
      </Section>

      <Section title="2. Your account">
        <ul>
          <li>
            To create a storefront, save storefronts or comment, you sign in with your Google account or with email and password, and you must be 18
            or older or have permission from a parent or guardian.
          </li>
          <li>Each account has one storefront and one link. You are responsible for everything that happens in your account.</li>
          <li>Some links are reserved. We may reclaim a link that impersonates another person or brand, or that violates third-party rights.</li>
        </ul>
      </Section>

      <Section title="3. Your storefront content">
        <ul>
          <li>
            You are responsible for the coupons, prices, products, texts, images and links you publish, and you warrant that you have the right
            to share them. In outfit photos, only post images of yourself or that you are authorized to use, including of any people who appear
            in them.
          </li>
          <li>
            When a recommendation is advertising (paid, in exchange for products or for a commission), follow the advertising disclosure rules of
            Brazil&apos;s Consumer Protection Code and CONAR.
          </li>
          <li>
            The content remains yours. You authorize us to store it, display it on your storefront and in discovery areas of the site (such as
            the home page) and to generate promotional images with it, for as long as the storefront is published.
          </li>
        </ul>
      </Section>

      <Section title="4. Comments">
        <ul>
          <li>Comments and replies are public and show your name and, if you sign in with Google, your profile photo. You are responsible for what you write.</li>
          <li>
            You can delete your comments whenever you want. The storefront owner can also delete any comment on it. Deleting a comment also
            deletes its replies.
          </li>
        </ul>
      </Section>

      <Section title="5. Coupons, prices and purchases">
        <p>
          {BRAND} does not sell products and is not part of any purchase. Coupons, prices and availability are provided by each storefront&apos;s
          owner and may change or stop being valid at the brand&apos;s store at any time. The purchase, payment, delivery, exchanges and returns are
          the responsibility of the store where you buy. Always check the final price before paying.
        </p>
      </Section>

      <Section title="6. Affiliate links and metrics">
        <p>
          Links to stores may be the storefront owner&apos;s affiliate links or carry campaign parameters (UTM) that identify the storefront they came
          from. The storefront owner may receive a commission on sales. We count visits and clicks anonymously to show metrics to the storefront
          owner, as explained in the <Link href="/privacidade">Privacy Policy</Link>.
        </p>
      </Section>

      <Section title="7. What is not allowed">
        <ul>
          <li>Publishing illegal, misleading or offensive content, or content that violates third-party rights such as trademarks and copyright.</li>
          <li>Sharing fake coupons or prices you know are wrong.</li>
          <li>Using links that lead to scams, malware or pages that try to collect data improperly.</li>
          <li>Impersonating another person or brand.</li>
          <li>Trying to access other people&apos;s accounts, overloading the site or collecting data from it in an automated way without permission.</li>
        </ul>
      </Section>

      <Section title="8. Suspension and termination">
        <p>
          You can stop using {BRAND} whenever you want and delete your account in Settings (in your photo&apos;s menu, “Delete my account”).
          Deletion immediately erases your storefront and all its content and cannot be undone; the link becomes available to someone else. You
          can also request deletion at {mail}. We may remove content and suspend or close accounts that violate these terms or the law, with
          notice whenever possible.
        </p>
      </Section>

      <Section title="9. Liability">
        <p>
          We work to keep the site available and running well, but it is provided as is and may have interruptions. To the extent permitted by
          law, {BRAND} is not responsible for coupons, prices or products shared on storefronts, nor for purchases made at stores. Nothing in
          these terms limits rights that the law guarantees to consumers.
        </p>
      </Section>

      <Section title="10. Brand">
        <p>The {BRAND} name, logo and site design belong to {BRAND} and may not be used without permission.</p>
      </Section>

      <Section title="11. Changes to these terms">
        <p>
          We may update these terms. The date at the top shows the version in effect and, if the change is significant, we will let you know
          by your account email before it takes effect.
        </p>
      </Section>

      <Section title="12. Governing law">
        <p>
          These terms are governed by the laws of Brazil. When the user is a consumer, the courts of the user&apos;s place of residence have
          jurisdiction, under Brazil&apos;s Consumer Protection Code.
        </p>
      </Section>

      <Section title="13. Contact">
        <p>Questions about these terms: {mail}.</p>
      </Section>
    </LegalPage>
  );
}
