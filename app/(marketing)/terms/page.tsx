import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for using Rainmaker",
};

const TERMS_OF_SERVICE = `TERMS OF SERVICE
Rainmaker.fun
Last Updated: January 2025
IMPORTANT: PLEASE READ THESE TERMS CAREFULLY. BY USING RAINMAKER, YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE, DO NOT USE THE PLATFORM.
1. Acceptance of Terms
By accessing or using Rainmaker.fun (the "Platform"), you agree to be bound by these Terms of Service ("Terms"). These Terms constitute a legally binding agreement between you and Rainmaker ("we," "us," or "our"). If you are using the Platform on behalf of an organization, you represent that you have authority to bind that organization to these Terms.
2. Platform Description
Rainmaker is an AI-powered platform that provides autonomous trading agents ("AI Agents") to execute trades on prediction markets including Kalshi (via DFlow), Polymarket, and other supported exchanges. The Platform allows users to deploy AI Agents that analyze sports and other prediction markets to identify and execute trades based on algorithmic strategies.
3. Eligibility
You must be at least 18 years old and legally able to enter into contracts in your jurisdiction. You must not be located in, or a citizen or resident of, any jurisdiction where prediction market trading is prohibited. You are responsible for ensuring your use of the Platform complies with all applicable laws and regulations in your jurisdiction. Certain prediction markets (such as Kalshi) may have additional geographic restrictions.
4. Account and Wallet
To use the Platform, you must connect a compatible cryptocurrency wallet. You are solely responsible for maintaining the security of your wallet, private keys, and any credentials. We will never ask for your private keys. Any transactions initiated through your connected wallet are your responsibility. We are not liable for any loss resulting from unauthorized access to your wallet.
5. Tier Structure and $RAIN Token
The Platform operates on a tiered structure based on $RAIN token holdings:
Retail Tier: No token requirement. $100 cap per trade.
Prime Tier: 500,000 $RAIN required. $500 cap per trade.
Ultra Tier: 3,000,000 $RAIN required. $5,000 cap per trade. Includes priority fills, early access to advanced AI models, and bet insurance on qualifying strategies.
Prestige Tier: 6,000,000 $RAIN required. Unlimited trade caps. Includes priority fills, early access to advanced AI models, and bet insurance on qualifying strategies.
Performance Fee Structure: Fees are calculated based on profit percentage achieved on each winning trade, with higher profits incurring higher fee rates. The fee schedule by tier is as follows:
0-50% profit: Retail 10%, Prime 8%, Ultra 6%, Prestige 4%
50-150% profit: Retail 15%, Prime 12%, Ultra 10%, Prestige 7%
150-300% profit: Retail 18%, Prime 16%, Ultra 14%, Prestige 11%
300%+ profit: Retail 20%, Prime 19%, Ultra 18%, Prestige 15%
Token requirements, tier benefits, and fee structures may be modified at our discretion with reasonable notice. $RAIN is a utility token for Platform access; we make no representations regarding its value or potential returns.
6. Fees
Rainmaker charges performance fees only on winning trades. You pay nothing on losing trades. Performance fees are automatically deducted from winning trade proceeds before distribution to your wallet. Fee percentages are determined by your tier level. We reserve the right to modify fee structures with advance notice. Additional fees from third-party services (exchanges, gas fees, bridging) are your responsibility.
7. AI Agent Trading
By using our AI Agents, you authorize them to execute trades on your behalf on connected prediction markets. AI Agents operate autonomously based on algorithmic strategies. You understand that past performance does not guarantee future results. All trading decisions executed by AI Agents are final. You accept full responsibility for all trades executed through your account.
8. Risk Disclosure
IMPORTANT: PREDICTION MARKET TRADING INVOLVES SUBSTANTIAL RISK OF LOSS.
You acknowledge and agree that: prediction market trading is speculative and may result in loss of your entire investment; AI performance metrics are historical and do not guarantee future results; market conditions, technical issues, or other factors may adversely affect trading outcomes; cryptocurrency and token values are volatile and may fluctuate significantly; smart contract risks, including bugs or exploits, may result in loss of funds; and regulatory changes may affect the availability or legality of prediction markets. You should only trade with funds you can afford to lose.
9. Coverage Feature
Ultra and Prestige tier users may have access to Coverage, a feature designed to recover a portion of losses on losing trades. Coverage is not insurance and does not guarantee full recovery of losses. Coverage terms, availability, and recovery percentages may vary and are subject to change. Coverage is provided on a best-efforts basis.
10. Prohibited Uses
You agree not to: use the Platform for any illegal purpose or in violation of any laws; attempt to manipulate markets or engage in fraudulent activity; interfere with or disrupt the Platform or its infrastructure; reverse engineer, decompile, or attempt to extract source code; use automated systems (other than our AI Agents) to access the Platform; impersonate others or provide false information; circumvent any security measures or access restrictions; or use the Platform if you are in a restricted jurisdiction.
11. Intellectual Property
All content, features, and functionality of the Platform, including our AI models, algorithms, software, text, graphics, and logos, are owned by Rainmaker and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express written permission.
12. Disclaimer of Warranties
THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE, OR THAT AI AGENTS WILL ACHIEVE ANY PARTICULAR RESULTS.
13. Limitation of Liability
TO THE MAXIMUM EXTENT PERMITTED BY LAW, RAINMAKER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR FUNDS, ARISING FROM YOUR USE OF THE PLATFORM. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT OF FEES YOU PAID TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM.
14. Indemnification
You agree to indemnify and hold harmless Rainmaker and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Platform, your violation of these Terms, or your violation of any rights of a third party.
15. Modifications to Service
We reserve the right to modify, suspend, or discontinue the Platform or any part thereof at any time, with or without notice. We shall not be liable for any modification, suspension, or discontinuation of the Platform.
16. Termination
We may terminate or suspend your access to the Platform immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the Platform ceases immediately. Provisions that by their nature should survive termination shall survive.
17. Governing Law and Disputes
These Terms shall be governed by the laws of the State of Delaware, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the Platform shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You waive any right to participate in class action lawsuits or class-wide arbitration.
18. Changes to Terms
We may revise these Terms at any time by posting an updated version on the Platform. Material changes will be communicated with reasonable notice. Your continued use of the Platform after changes become effective constitutes acceptance of the revised Terms.
19. Severability
If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.
20. Entire Agreement
These Terms, together with our Privacy Policy, constitute the entire agreement between you and Rainmaker regarding the Platform and supersede all prior agreements.
21. Contact
Questions about these Terms should be directed to: rain@rainmaker.fun
BY USING RAINMAKER, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.`;

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      <div className="mx-auto w-full max-w-[920px] px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
        <div className="mt-6 whitespace-pre-wrap text-sm leading-6 text-white/75">
          {TERMS_OF_SERVICE}
        </div>
      </div>
    </div>
  );
};

export default TermsPage;

