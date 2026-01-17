import { BiSolidPlaylist, BiSolidVideos } from "react-icons/bi";
import {
  FaArrowRight,
  FaExclamationCircle,
  FaInfoCircle,
  FaListUl,
  FaRegBookmark,
} from "react-icons/fa";
import { FaRepeat, FaShuffle } from "react-icons/fa6";
import { IoMdMusicalNote } from "react-icons/io";
import { IoClose, IoEyeOff } from "react-icons/io5";

export function AboutPage() {
  return (
    <main className="main px-2 pt-4 md:px-8 overflow-y-auto!">
      <h1 className="sans-serif text-xl md:text-4xl mb-8">このサイトについて</h1>

      <article className="mb-10">
        <h2 className="text-2xl mb-4">
          <BiSolidVideos className="inline-block mr-2 mb-1" />
          Archives
        </h2>
        <div className="border-l-2 ml-2 pl-4">
          <p className="mb-3">
            YouTube チャンネルで公開されている配信アーカイブや動画を一覧表示しています。
          </p>
          <p className="mb-3">
            カテゴリでの絞り込みや、フリーワード検索（配信タイトル、動画タイトル）で目的の動画を探すことができます。
            <br />
            投稿日時や再生回数、高評価数でのソートも可能です。
          </p>
          <p className="mb-3">
            ※データは定期的に取得した情報を表示しているためリアルタイムの情報ではありません。
            <br />
            ※メンバー限定コンテンツや限定公開動画、非公開になった動画は表示されません。
          </p>
        </div>
      </article>

      <article className="mb-10">
        <h2 className="text-2xl mb-4">
          <IoMdMusicalNote className="inline-block mr-2 mb-1" />
          Songs
        </h2>
        <div className="border-l-2 ml-2 pl-4">
          <p className="mb-3">歌枠や歌ってみた動画で歌唱された曲の一覧です。</p>
          <p className="mb-3">
            楽曲タイトルをクリックするとインラインでYouTubeの動画プレイヤーが表示され、該当の動画の歌唱部分から再生されます。
            <br />
            ページ下部のコントローラを使って再生や一時停止、音量調整などの操作が可能です。
            <br />
            <button className="btn px-1.5! py-0! mb-0.5">
              <FaShuffle />
            </button>
            ボタンでシャッフル再生、
            <button className="btn px-1.5! py-0! mb-0.5">
              <FaRepeat />
            </button>
            ボタンでリピート再生が可能です。
            <br />
            <button className="btn px-1.5! py-0! mb-0.5">
              <IoEyeOff />
            </button>
            ボタンで動画再生を非表示にしてバックグラウンドで再生できます。
            <br />
            <button className="btn px-1.5! py-0! mb-0.5">
              <IoClose />
            </button>
            ボタンをクリックすると再生を停止してプレイヤーを閉じます。
          </p>
          <p className="mb-3">
            <button className="btn py-1!">
              <FaRegBookmark />
              <span className="ml-1 text-sm">追加</span>
            </button>
            ボタンでお気に入りの楽曲をプレイリストに追加できます。
            <br />
            追加済みのプレイリストを選択すると、プレイリストから削除します。
            <br />
            <button className="btn py-1!">
              <FaListUl />
              <span className="ml-1 text-sm">複数選択</span>
            </button>
            ボタンで複数の曲を選択して一括でプレイリストに追加できます。
          </p>
          <p className="mb-3">
            フリーワード検索（配信タイトル、楽曲タイトル、アーティスト名）での絞り込みが可能です。
            <br />
            歌ったことのあるアーティストやタイトルをドロップダウンから選択して絞り込むこともできます。
          </p>
          <p className="mb-3">
            歌唱パートの抽出にはコメントのタイムスタンプを参考にさせていただきました。
            <br />
            いつも本当にありがとうございます！
          </p>
          <p className="mb-3">
            ※コラボ枠で稀羽すうさんが歌唱していないパートは除外しています。
            <br />
            ※楽曲情報は配信終了後に手動で追加していますので最新ではない場合があります。
          </p>
        </div>
      </article>

      <article className="mb-10">
        <h2 className="text-2xl mb-4">
          <BiSolidPlaylist className="inline-block mr-2 mb-1" />
          Playlist
        </h2>
        <div className="border-l-2 ml-2 pl-4">
          <p className="mb-3">Songs ページで追加した楽曲をリピート・シャッフル再生できます。</p>
          <p className="mb-3">
            <strong className="text-[#f2bdf1]">
              <FaExclamationCircle className="inline mr-1 mb-1" />
              作成したプレイリストは使用中のブラウザに保存されます。
            </strong>
            <br />
            異なるデバイスやブラウザでプレイリストを共有することができません。
            <br />
            また、ブラウザのサイトデータを削除するとプレイリストの内容も失われますのでご注意ください。
            <br />
            プレイリストの内容を他のデバイスやブラウザで利用したい場合やバックアップしたい場合は、
            画面上部のエクスポート・インポート機能をご利用ください。
          </p>
        </div>
      </article>

      <article className="mb-10">
        <h2 className="text-2xl mb-4">
          <FaInfoCircle className="inline-block mr-2 mb-1" />
          さいごに
        </h2>
        <div className="border-l-2 ml-2 pl-4">
          <p className="mb-3">
            当サイトは「歌枠の曲をプレイリスト化したい！」という欲求から勢いで作成した非公式のファンサイトです。
            <br />
            少しでも推し活の助けになれれば幸いです。
            <br />
            もし内容の誤りや歌唱位置の指摘、不具合、改善点などがありましたら
            <a
              href="https://twitter.com/wiro34"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              @wiro34
            </a>
            までご連絡ください。
          </p>
          <p className="mb-3">
            当サイトの管理・運営は
            <a
              href="https://twitter.com/wiro34"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              @wiro34
            </a>
            が個人で行っております。
            <br />
            株式会社mikai様及びRe:AcT、その他関係各社様とは一切関係ありません。
            <br />
            関係各社様への当サイトに関するお問い合わせはご遠慮ください。
          </p>
          <p className="mb-3">
            当サイトに掲載している動画・サムネイルなどのコンテンツはすべて株式会社mikai様、Re:AcTライバー「稀羽すう」様に帰属しております。
            <br />
            <FaArrowRight className="inline-block mb-1 mr-1" />
            <a
              href="https://www.v-react.com/guideline"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              二次的創作ガイドライン
            </a>
          </p>
          <p className="mb-3">
            当サイトを制作するにあたり
            <a
              href="https://nanaga-kita.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-1 underline"
            >
              Nana Cheer!
            </a>
            様を参考にさせていただきました。
          </p>
        </div>
      </article>
    </main>
  );
}
