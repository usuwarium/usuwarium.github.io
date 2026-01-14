import { VideoCarousel, type VideoSection } from "@/components/VideoCarousel";
import { useEffect } from "react";
import { FaArrowRight } from "react-icons/fa";
import { FaTiktok, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { GiCamel } from "react-icons/gi";
import { TbWorld } from "react-icons/tb";
import { Link, useNavigate } from "react-router-dom";
import { useKonamiCode } from "../hooks/useKonamiCode";

const VIDEO_SECTIONS: VideoSection[] = [
  {
    title: "Music Videos",
    linkTo: "/archives?filter=mv&q=-shorts",
    linkText: "もっと見る",
    filter: "mv",
    q: "-shorts",
  },
  {
    title: "Shorts",
    linkTo: "/archives?filter=shorts&q=-歌枠",
    linkText: "もっと見る",
    filter: "shorts",
    q: "-歌枠",
  },
  {
    title: "歌枠",
    linkTo: "/archives?filter=singingStream",
    linkText: "もっと見る",
    filter: "singingStream",
  },
];

export function TopPage() {
  const navigate = useNavigate();
  const konamiTriggered = useKonamiCode();

  useEffect(() => {
    if (konamiTriggered) {
      navigate("/manage");
    }
  }, [konamiTriggered, navigate]);

  return (
    <main className="main px-4 md:px-8 md:overflow-auto!">
      <header className="header px-0! flex items-center">
        <img src="icon.svg" alt="Logo" className="w-[2.5rem] inline" />
        <h1 className="sans-serif text-4xl ml-3 mb-2 inline">うすわりうむ</h1>
      </header>

      <article className="mb-12">
        <p>
          このサイトは、Re:AcT 所属 だつりょく系Vsinger みにくいあひるのこ
          稀羽すう（うすわすう）の応援を目的にファンが有志で作成した非公式ファンサイトです。
        </p>
        <p>株式会社mikai様及びRe:AcT、その他関係各社様とは一切関係ありません。</p>
        <p className="mt-4">
          <Link to="/about" className="link-btn">
            はじめての方はこちら
            <FaArrowRight className="inline ml-2 mb-1" />
          </Link>
        </p>
      </article>

      {VIDEO_SECTIONS.map((section) => (
        <VideoCarousel key={section.filter} section={section} className="mb-12" />
      ))}

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">リンク</h2>
        <p className="flex flex-wrap gap-4 justify-start">
          <a href="https://www.youtube.com/@Suu_Usuwa" className="link-btn">
            <FaYoutube className="mr-1 mb-1" />
            稀羽すう
          </a>
          <a href="https://www.youtube.com/@REVERBERATION_official" className="link-btn">
            <FaYoutube className="mr-1 mb-1" />
            REVERBERATION
          </a>
          <a href="https://x.com/usuwasuu" className="link-btn">
            <FaXTwitter className="mr-1 mb-1" />
            稀羽すう🦢
          </a>
          <a href="https://www.tiktok.com/@suu_usuwa" className="link-btn">
            <FaTiktok className="mr-1 mb-1" />
            TikTok
          </a>
          <a href="https://lit.link/usuwasuu" className="link-btn">
            <TbWorld className="mr-1 mb-1" />
            lit.link
          </a>
          <a href="https://react.booth.pm/" className="link-btn">
            <GiCamel className="mr-1 mb-1" />
            Re:AcT 公式 BOOTH
          </a>
        </p>
      </section>
    </main>
  );
}
