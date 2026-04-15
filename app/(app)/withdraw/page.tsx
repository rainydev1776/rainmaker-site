"use client";

import { WalletPanel } from "@/components/features";

const WithdrawPage = () => {
  return (
    <div
      className="flex w-full min-h-0 min-w-0 flex-1 flex-col rounded-[12px] p-3 overflow-auto sm:rounded-[16px] sm:p-4 lg:p-6"
      style={{
        background:
          "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.01) 100%), #0D0D0F",
        boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
      }}
    >
      <div className="flex flex-1 items-start justify-center py-4 sm:pt-8 sm:pb-8">
        <WalletPanel />
      </div>
    </div>
  );
};

export default WithdrawPage;


