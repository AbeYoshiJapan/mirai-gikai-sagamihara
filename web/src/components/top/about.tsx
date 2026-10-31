import Image from "next/image";

export function About() {
  return (
    <div id="about" className="scroll-mt-24 py-10">
      <div className="flex flex-col gap-4">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4">
          <h2>
            <Image
              src="/icons/about-typography.svg"
              alt="About"
              width={143}
              height={36}
              priority
            />
          </h2>
          <p className="text-sm font-bold text-primary-accent">
            みらい議会@墨田区とは
          </p>
        </div>

        {/* コンテンツ */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-2xl font-bold leading-[43.2px]">
              墨田区議会での議論を
              <br />
              できる限りわかりやすく
            </h3>
            <p className="text-[15px] leading-[28px] text-black">
              みらい議会@墨田区は、墨田区議会で今どんな議案が審議されているかを、わかりやすく伝えるサイトです。区議会の会議録など公開されている一次資料をもとに整理しています。
              <br />
              なお、本サービスは墨田区議会議員の井上ひろきが、チームみらいの「みらい議会」を元に作成したものです。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
