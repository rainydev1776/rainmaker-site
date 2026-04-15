import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "About Rainmaker",
};

const AboutPage = () => {
  return (
    <div
      className="flex w-full min-w-0 flex-1 items-center justify-center rounded-[12px] p-3 sm:rounded-[16px] sm:p-4"
      style={{
        background:
          "linear-gradient(0deg, rgba(255, 255, 255, 0.00) 34.52%, rgba(255, 255, 255, 0.01) 100%), #0D0D0F",
        boxShadow: "0 1px 0 0 rgba(255, 255, 255, 0.10) inset",
      }}
    >
      <div className="text-center">
        <h1 className="text-xl font-semibold text-white sm:text-2xl">About</h1>
        <p className="mt-2 text-sm text-[#757575]">Coming soon</p>
      </div>
    </div>
  );
};

export default AboutPage;


