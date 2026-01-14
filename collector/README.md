# Collector

YouTube チャンネルの情報を取得して動画の情報やサムネイル、歌枠の歌唱タイムスタンプ情報などを収集してデータベースを構築するプロジェクト。

## セットアップ

```bash
npm install
```

## 環境変数

`.env` ファイルを作成し、以下の環境変数を設定してください：

```
YT_API_KEY=your_youtube_api_key
SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_CREDENTIALS_PATH=../recognizer/credentials.json  # オプション（デフォルトで使用されます）
```

`.env.example` をコピーして使用できます。

### Google Sheets API の設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. Google Sheets API を有効化
3. サービスアカウントを作成し、JSON キーをダウンロード
4. ダウンロードした JSON ファイルを `credentials.json` として配置
5. Google Spreadsheet をサービスアカウント（`client_email`）と共有（編集権限を付与）

## 使用方法

```bash
# 開発モード
npm run dev

# ビルド
npm run build

# 実行
npm start
```

## 機能

- YouTube Data API を使ってチャンネル情報を取得
- 動画のタイトル、サムネイル、タグ、URL などを収集
- 動画を歌枠、歌動画、その他にカテゴリ分類
- 歌枠動画から歌唱パートのタイムスタンプを抽出
- Google Sheets にデータを保存
