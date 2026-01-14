#!/usr/bin/env node

/**
 * データ解析メインスクリプト
 */

import dotenv from "dotenv";
import { YouTubeAPI } from "./youtube.ts";
import { Database } from "./database.ts";
import { VideoProcessor } from "./processor.ts";
import { SheetsClient } from "./sheets-client.ts";

dotenv.config();

const CHANNEL_NAME = "@Suu_Usuwa";

async function main() {
  const ytApiKey = process.env.YT_API_KEY;
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (!ytApiKey) {
    throw new Error("YT_API_KEY 環境変数が設定されていません");
  }

  if (!spreadsheetId) {
    throw new Error("SPREADSHEET_ID 環境変数が設定されていません");
  }

  console.log("=".repeat(60));
  console.log("YouTube チャンネル情報収集ツール");
  console.log("=".repeat(60));
  console.log(`チャンネル: ${CHANNEL_NAME}\n`);

  // YouTube API クライアントを初期化
  console.log("YouTube API クライアントを初期化中...");
  const youtube = new YouTubeAPI(ytApiKey, CHANNEL_NAME);
  await youtube.initialize();
  console.log("✓ YouTube API クライアントを初期化しました\n");

  // Google Sheets クライアントを初期化
  console.log("Google Sheets クライアントを初期化中...");
  const sheetsClient = new SheetsClient({ spreadsheetId });
  console.log("✓ Google Sheets クライアントを初期化しました\n");

  // データベースを初期化
  console.log("データベースを初期化中...");
  const database = new Database(sheetsClient);
  await database.load();
  console.log("✓ データベースを初期化しました\n");

  // プロセッサーを初期化
  const processor = new VideoProcessor(youtube, database);

  // チャンネルの全動画を処理
  await processor.processChannel();

  console.log("\n" + "=".repeat(60));
  console.log("処理が完了しました");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("\nエラーが発生しました:");
  console.error(error);
  process.exit(1);
});
