/**
 * Google Sheets API クライアント
 */

import { google } from "googleapis";
import type { Video, Song } from "../../src/lib/types";

interface SheetsConfig {
  spreadsheetId: string;
}

export class SheetsClient {
  private sheets;
  private spreadsheetId: string;
  private readonly VIDEOS_SHEET_NAME = "動画一覧";
  private readonly METADATA_SHEET_NAME = "メタデータ";

  constructor(config: SheetsConfig) {
    this.spreadsheetId = config.spreadsheetId;

    // サービスアカウント認証（credentials.json ファイルを使用）
    const auth = new google.auth.GoogleAuth({
      keyFile: "credentials.json",
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    this.sheets = google.sheets({ version: "v4", auth });
  }

  /**
   * シートのヘッダーを取得
   */
  private async getHeaders(sheetName: string): Promise<string[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A1:Z1`,
    });

    return (response.data.values?.[0] as string[]) || [];
  }

  /**
   * オブジェクトを配列に変換（ヘッダーの順序に従う）
   */
  private objectToRow(headers: string[], obj: Video | Song): unknown[] {
    return headers.map((header) => {
      const value = obj[header as keyof typeof obj];
      if (value === undefined || value === null) return "";
      if (typeof value === "object") return JSON.stringify(value);
      return value;
    });
  }

  /**
   * 配列をオブジェクトに変換
   */
  private rowToObject(headers: string[], row: unknown[]): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      const value = row[index];
      if (header === "tags" && typeof value === "string") {
        try {
          obj[header] = JSON.parse(value);
        } catch {
          obj[header] = [];
        }
      } else if (
        (header === "completed" || header === "singing" || header === "available") &&
        typeof value === "string"
      ) {
        obj[header] = value.toLowerCase() === "true";
      } else {
        obj[header] = value;
      }
    });
    return obj;
  }

  /**
   * 動画データを取得
   */
  async getVideos(): Promise<Video[]> {
    const videoResponse = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.VIDEOS_SHEET_NAME}!A:Z`,
    });

    const videoData = videoResponse.data.values || [];
    const videos: Video[] = [];

    if (videoData.length > 1) {
      const videoHeaders = videoData[0] as string[];
      for (let i = 1; i < videoData.length; i++) {
        videos.push(this.rowToObject(videoHeaders, videoData[i]) as unknown as Video);
      }
    }

    return videos;
  }

  /**
   * 動画を追加または更新
   */
  async addVideo(video: Video): Promise<void> {
    await this.batchAddVideos([video]);
  }

  /**
   * 複数の動画を一括で追加または更新
   */
  async batchAddVideos(videos: Video[]): Promise<void> {
    if (videos.length === 0) return;

    const headers = await this.getHeaders(this.VIDEOS_SHEET_NAME);

    // 既存データを取得
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.VIDEOS_SHEET_NAME}!A:Z`,
    });

    const data = response.data.values || [];
    const videoIdIndex = headers.indexOf("video_id");

    // 更新対象と追加対象を分類
    const updates: { row: number; video: Video }[] = [];
    const additions: Video[] = [];

    for (const video of videos) {
      let found = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][videoIdIndex] === video.video_id) {
          updates.push({ row: i + 1, video });
          found = true;
          break;
        }
      }
      if (!found) {
        additions.push(video);
      }
    }

    // 一括更新と追加を実行
    const batchUpdateData = [];

    // 更新データを追加
    for (const { row, video } of updates) {
      batchUpdateData.push({
        range: `${this.VIDEOS_SHEET_NAME}!A${row}:Z${row}`,
        values: [this.objectToRow(headers, video)],
      });
    }

    // 新規データを追加
    if (additions.length > 0) {
      const addRows = additions.map((video) => this.objectToRow(headers, video));
      batchUpdateData.push({
        range: `${this.VIDEOS_SHEET_NAME}!A${data.length + 1}`,
        values: addRows,
      });
    }

    // 一括更新を実行
    if (batchUpdateData.length > 0) {
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: batchUpdateData,
        },
      });
    }
  }

  /**
   * メタデータのlast_updated_atを更新
   */
  async updateLastUpdatedAt(): Promise<void> {
    const now = new Date().toISOString();

    // メタデータシートのヘッダーと値を取得
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.METADATA_SHEET_NAME}!A:B`,
    });

    const data = response.data.values || [];
    let lastUpdatedRow = -1;

    // last_updated_at の行を探す
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === "last_updated_at") {
        lastUpdatedRow = i + 1;
        break;
      }
    }

    if (lastUpdatedRow === -1) {
      // last_updated_at が存在しない場合は末尾に追加
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.METADATA_SHEET_NAME}!A:B`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["last_updated_at", now]],
        },
      });
    } else {
      // 既存の行を更新
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.METADATA_SHEET_NAME}!B${lastUpdatedRow}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[now]],
        },
      });
    }
  }
}
