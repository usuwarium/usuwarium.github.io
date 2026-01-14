# うすわりうむ

![icon.svg](./public/icon.svg)

「稀羽すう」YouTube チャンネルの歌枠の曲をプレイリスト化する非公式ファンサイトです

[うすわりうむ](https://usuwarium.github.io/)

## 📖 概要

稀羽すうチャンネル ([@Suu_Usuwa](https://www.youtube.com/@Suu_Usuwa)) の YouTube 配信アーカイブや動画をデータベース化し、えさがより楽しく推し活できるようにすることを目的としています

プロジェクトは主に以下の 3 つのコンポーネントで構成されています：

- **Web アプリケーション (Root)**: 収集したデータを閲覧するための Web サイト。Vite + React + Tailwind CSS で構築されています。
- **データ収集 (Collector)**: YouTube Data API を使用して動画情報を収集する Node.js アプリケーション。
- **Google Apps Script (GAS)**: データ管理用のスプレッドシート連携スクリプト。

## 📂 ディレクトリ構成

```bash
.
├── src/            # Webアプリケーションのソースコード (React)
├── collector/      # データ収集・解析用スクリプト (Node.js)
├── gas/            # Google Apps Script コード
├── public/         # 静的アセット
└── ...
```

## 🚀 インストール手順

このプロジェクトではパッケージマネージャーとして [pnpm](https://pnpm.io/) の使用を推奨しています。

### 前提条件

- Node.js (v20 以上推奨)
- pnpm

### 1. リポジトリのクローン

```bash
git clone https://github.com/usuwarium/usuwarium.github.io.git
cd usuwarium
```

### 2. 依存関係のインストール

**Web アプリケーション:**

```bash
pnpm install
```

**Collector (データ収集ツール):**

```bash
cd collector
pnpm install
```

## 🛠️ 開発方法

### Web アプリケーションの起動

ルートディレクトリで以下のコマンドを実行すると、開発サーバーが起動します。

```bash
pnpm dev
```

ブラウザで `http://localhost:5173` にアクセスしてください。

### Collector の設定と実行

`collector` ディレクトリに `.env` ファイルを作成し、必要な環境変数を設定します（`.env.example` を参考にしてください）。

```env
YT_API_KEY=your_youtube_api_key
SPREADSHEET_ID=your_spreadsheet_id_here
```

開発モードでの実行:

```bash
cd collector
pnpm dev
# または
pnpm start
```

## 📦 デプロイ方法

### Web アプリケーション

このプロジェクトは GitHub Pages へのデプロイを想定しています。GitHub Actions により、`main` ブランチへのプッシュ時に自動的にビルドとデプロイが行われます。

手動でビルドする場合:

```bash
pnpm build
```

ビルド成果物は `dist` ディレクトリに出力されます。

## Google Apps Script コード

usuwarium-db の拡張機能＞ Apps Script にアクセスし、gas/code.gs をエディタにコピー＆ペーストしてデプロイする

API Key は `node gas/generate-api-key.js` で生成して、Apps Script のスクリプトプロパティに `APP_ACCESS_KEY#` として登録する

## 🤝 貢献ガイドライン

1. Issue を確認し、取り組むタスクを決定してください。
2. リポジトリをフォークし、フィーチャーブランチを作成してください。
3. 変更を行い、コミットしてください。
   - `.env` などの機密情報を含むファイルはコミットしないでください。
4. プルリクエストを作成してください。

## 免責事項

このサイトは、Re:AcT 所属 だつりょく系 Vsinger みにくいあひるのこ 稀羽すう（うすわすう）の応援を目的にファンが有志で作成した非公式ファンサイトです。

株式会社 mikai 様及び Re:AcT、その他関係各社様とは一切関係ありません。

## 📄 ライセンス

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 利用しているオープンソースソフトウェア

本プロジェクトは以下のオープンソースソフトウェアを利用しています。

- [React](https://react.dev/) (MIT License)
- [Vite](https://vitejs.dev/) (MIT License)
- [Tailwind CSS](https://tailwindcss.com/) (MIT License)
- [React Router](https://reactrouter.com/) (MIT License)
- [Dexie.js](https://dexie.org/) (Apache License 2.0)
- [Embla Carousel](https://www.embla-carousel.com/) (MIT License)
- [React Icons](https://react-icons.github.io/react-icons/) (MIT License)
  - [Font Awesome](https://fontawesome.com/) (CC BY 4.0 License)
  - [Ionicons](https://ionic.io/ionicons) (MIT License)
  - [BoxIcons](https://boxicons.com/) (CC BY 4.0 License)
  - [Game Icons](https://game-icons.net/) (CC BY 3.0 License)
  - [Bootstrap Icons](https://github.com/twbs/icons) (MIT License)
- [googleapis](https://github.com/googleapis/google-api-nodejs-client) (Apache License 2.0)

---

Created for 稀羽すう with ❤️
