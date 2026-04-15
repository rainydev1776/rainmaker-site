import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for using Rainmaker",
};

const PRIVACY_POLICY = `PRIVACY POLICY
Rainmaker.fun
Last Updated: January 2025
This Privacy Policy explains how Rainmaker ("we," "us," or "our") collects, uses, discloses, and protects information when you use our platform at rainmaker.fun and related services (the "Platform"). By using the Platform, you agree to the collection and use of information in accordance with this policy.
1. Information We Collect
Wallet Information: When you connect your cryptocurrency wallet (via Privy or similar services), we collect your public wallet address. We do not have access to your private keys.
Transaction Data: We collect information about trades executed through our AI agents, including trade amounts, outcomes, timestamps, and performance metrics.
Token Holdings: We verify $RAIN token holdings to determine your tier status (Retail, Prime, Ultra, or Prestige).
Usage Data: We automatically collect information about how you interact with the Platform, including device information, browser type, IP address, and pages visited.
Communications: If you contact us, we may retain correspondence and contact information.
2. How We Use Your Information
We use collected information to: provide and maintain the Platform; execute trades through our AI agents on your behalf; calculate and collect performance fees; verify tier eligibility based on $RAIN holdings; improve our AI models and Platform functionality; communicate with you about updates, features, or support; detect and prevent fraud or unauthorized access; and comply with legal obligations.
3. Third-Party Services
Our Platform integrates with third-party services that have their own privacy policies: Kalshi and Polymarket (prediction market exchanges), DFlow (Kalshi integration), Privy (wallet connection), MoonPay (fiat on-ramp), and Li.Fi (bridging services). We encourage you to review their privacy policies. We are not responsible for the privacy practices of these third parties.
4. Blockchain Data
Transactions on blockchain networks are public by nature. Your wallet address and transaction history on public blockchains are visible to anyone. We cannot delete or modify blockchain data.
5. Data Sharing
We do not sell your personal information. We may share information with: service providers who assist in operating the Platform; prediction market exchanges to execute trades; law enforcement when required by law; and business successors in the event of a merger or acquisition.
6. Data Security
We implement reasonable security measures to protect your information. However, no method of transmission over the internet is 100% secure. You are responsible for maintaining the security of your wallet and private keys.
7. Data Retention
We retain your information for as long as your account is active or as needed to provide services. We may retain certain information as required by law or for legitimate business purposes.
8. Your Rights
Depending on your jurisdiction, you may have rights to: access, correct, or delete your personal information; object to or restrict certain processing; data portability; and withdraw consent where processing is based on consent. To exercise these rights, contact us at the information provided below.
9. Children's Privacy
The Platform is not intended for users under 18 years of age. We do not knowingly collect information from children. If you believe we have collected information from a child, please contact us immediately.
10. International Users
If you access the Platform from outside the United States, your information may be transferred to and processed in the United States or other countries with different data protection laws.
11. Changes to This Policy
We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on the Platform with an updated "Last Updated" date. Your continued use of the Platform after changes constitutes acceptance.
12. Contact Us
If you have questions about this Privacy Policy, please contact us at: rain@rainmaker.fun`;

const PrivacyPage = () => {
  return (
    <div
      className="flex w-full min-w-0 flex-1 justify-center rounded-[12px] p-3 sm:rounded-[16px] sm:p-6"
      style={{
        background:
          "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.01) 100%), #0D0D0F",
        boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
      }}
    >
      <div className="w-full max-w-[920px]">
        <h1 className="text-xl font-semibold text-white sm:text-2xl">
          Privacy Policy
        </h1>
        <div className="mt-5 whitespace-pre-wrap text-sm leading-6 text-white/75">
          {PRIVACY_POLICY}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
