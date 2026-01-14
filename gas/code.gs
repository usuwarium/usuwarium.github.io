// 曲一覧管理 Google Apps Script

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const VIDEOS_SHEET_NAME = "動画一覧";
const SONGS_SHEET_NAME = "曲一覧";
const METADATA_SHEET_NAME = "メタデータ";

// レート制限設定
const RATE_LIMIT_MINUTES = 1;
const MAX_REQUESTS = 30;

function getValidApiKeys() {
  const props = PropertiesService.getScriptProperties();
  return props
    .getKeys()
    .filter((key) => key.startsWith("APP_ACCESS_KEY"))
    .map((key) => props.getProperty(key));
}

// ===== メインハンドラー =====

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const apiKey = data.apiKey;

    // 認証チェック
    if (!validateApiKey(apiKey)) {
      return createResponse(false, "無効なAPIキーです", null, 403);
    }

    // レート制限チェック
    if (!checkRateLimit(apiKey)) {
      return createResponse(false, "レート制限を超えました", null, 429);
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ロックチェック（getDataは除外）
    if (data.action !== "getData" && isLocked(spreadsheet)) {
      return createResponse(
        false,
        "他の操作が実行中です。しばらく待ってから再度お試しください",
        null,
        423
      );
    }

    switch (data.action) {
      case "getData":
        return getData(spreadsheet);
      case "addVideo":
        return addVideo(spreadsheet, data.video);
      case "addSongs":
        return addSongs(spreadsheet, data.video_id, data.songs, data.completed);
      case "completeVideo":
        return completeVideo(spreadsheet, data.video_id);
      case "setSingingFalse":
        return setSingingFalse(spreadsheet, data.video_id);
      default:
        return createResponse(false, "不明なアクションです:", null, 400);
    }
  } catch (error) {
    logError("POST", error);
    return createResponse(false, error.toString(), null, 500);
  }
}

// ===== CRUD操作 =====

function getData(spreadsheet) {
  const videoSheet = spreadsheet.getSheetByName(VIDEOS_SHEET_NAME);
  const videoData = videoSheet.getDataRange().getValues();
  if (videoData.length <= 1) {
    return createResponse(true, "データがありません", { songs: [] });
  }
  const videoHeaders = videoData[0];
  const videos = videoData
    .slice(1)
    .map((row) => {
      const video = rowToObject(videoHeaders, row);
      // tagsを文字列から配列に変換
      if (video.tags && typeof video.tags === "string") {
        try {
          video.tags = JSON.parse(video.tags);
        } catch (e) {
          video.tags = [];
        }
      } else if (!video.tags) {
        video.tags = [];
      }
      return video;
    })
    .sort((a, b) => (a.published_at > b.published_at ? -1 : 1));

  const songSheet = spreadsheet.getSheetByName(SONGS_SHEET_NAME);
  const songData = songSheet.getDataRange().getValues();

  if (songData.length <= 1) {
    return createResponse(true, "データがありません", { songs: [] });
  }

  const songHeaders = songData[0];
  const songs = songData.slice(1).map((row) => {
    const song = rowToObject(songHeaders, row);
    // tagsを文字列から配列に変換
    if (song.tags && typeof song.tags === "string") {
      try {
        song.tags = JSON.parse(song.tags);
      } catch (e) {
        song.tags = [];
      }
    } else if (!song.tags) {
      song.tags = [];
    }
    return song;
  });

  return createResponse(true, "データを取得しました", {
    videos: videos,
    videoCount: videos.length,
    songs: songs,
    songCount: songs.length,
  });
}

/**
 * 動画を追加
 * 既に存在する場合も最新情報にアップデート
 */
function addVideo(spreadsheet, video) {
  try {
    setLock(spreadsheet, true);

    // バリデーション
    const validation = validateVideo(video);
    if (!validation.isValid) {
      return createResponse(false, validation.errors.join(", "), null, 400);
    }
    // デフォルト値を設定
    const videoData = {
      video_id: video.video_id || "",
      channel_id: video.channel_id || "",
      title: video.title || "",
      published_at: video.published_at || "",
      singing: video.singing || false,
      tags: JSON.stringify(video.tags) || "",
      view_count: video.view_count || 0,
      like_count: video.like_count || 0,
      duration: video.duration || 0,
      processed_at: video.processed_at || "",
      completed: video.completed || false,
    };

    const sheet = spreadsheet.getSheetByName(VIDEOS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const videoIdIndex = headers.indexOf("video_id");

    // 既存動画を検索して更新
    for (let i = 1; i < data.length; i++) {
      if (data[i][videoIdIndex] == video.video_id) {
        const updatedRow = headers.map((header, index) => {
          return videoData[header] !== undefined ? videoData[header] : data[i][index];
        });
        sheet.getRange(i + 1, 1, 1, headers.length).setValues([updatedRow]);
        return createResponse(true, "動画情報を更新しました", {
          video: videoData,
        });
      }
    }

    // 新規動画として追加
    const row = headers.map((header) => (videoData[header] !== undefined ? videoData[header] : ""));
    sheet.appendRow(row);

    return createResponse(true, "動画を追加しました", {
      video: videoData,
    });
  } finally {
    setLock(spreadsheet, false);
  }
}

/**
 * 歌唱パートを追加
 * @param {Spreadsheet} spreadsheet
 * @param {string} videoId - 対象の動画ID
 * @param {Array} songs - 追加する曲の配列
 * @param {boolean} completed - 動画を完了状態にするかどうか（オプション）
 * @returns
 */
function addSongs(spreadsheet, videoId, songs, completed) {
  try {
    setLock(spreadsheet, true);

    // バリデーション
    if (!Array.isArray(songs) || songs.length === 0) {
      return createResponse(false, "曲データの配列が必要です", null, 400);
    }

    const validation = songs
      .map((song) => validateSong(song))
      .filter((v) => !v.isValid)
      .map((v) => v.errors)
      .flat();
    if (validation.length > 0) {
      return createResponse(false, validation.join(", "), null, 400);
    }

    const sheet = spreadsheet.getSheetByName(SONGS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const videoIdIndex = headers.indexOf("video_id");

    // 対象のvideo_idの既存データを削除
    if (songs.length > 0) {
      // 後ろから削除しないとインデックスがずれるため、逆順でループ
      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][videoIdIndex] === videoId) {
          sheet.deleteRow(i + 1);
        }
      }
    }

    // データを追加
    songs.forEach((song) => {
      const row = headers.map((header) =>
        song[header] !== undefined ? escapeFormula(song[header]) : ""
      );
      sheet.appendRow(row);
    });

    // completed が指定されている場合、動画のcompleted状態を更新
    if (completed !== undefined && songs.length > 0) {
      const videoId = songs[0].video_id;
      if (videoId) {
        const videoSheet = spreadsheet.getSheetByName(VIDEOS_SHEET_NAME);
        const videoData = videoSheet.getDataRange().getValues();
        const videoHeaders = videoData[0];
        const videoIdIndex = videoHeaders.indexOf("video_id");
        const completedIndex = videoHeaders.indexOf("completed");

        for (let i = 1; i < videoData.length; i++) {
          if (videoData[i][videoIdIndex] === videoId) {
            videoSheet.getRange(i + 1, completedIndex + 1).setValue(completed);
            break;
          }
        }
      }
    }

    return createResponse(true, "曲を追加しました");
  } finally {
    setLock(spreadsheet, false);
  }
}

/**
 * 動画を完了状態にする
 * @param {Spreadsheet} spreadsheet
 * @param {string} videoId
 * @returns
 */
function completeVideo(spreadsheet, videoId) {
  try {
    setLock(spreadsheet, true);

    if (!videoId) {
      return createResponse(false, "video_idが指定されていません", null, 400);
    }

    const sheet = spreadsheet.getSheetByName(VIDEOS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const videoIdIndex = headers.indexOf("video_id");
    const completedIndex = headers.indexOf("completed");

    // 対象行を検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][videoIdIndex] === videoId) {
        // completed列をtrueに更新
        sheet.getRange(i + 1, completedIndex + 1).setValue(true);

        logAccess("COMPLETE_VIDEO", videoId, "success");

        return createResponse(true, "動画を完了状態にしました", {
          video_id: videoId,
        });
      }
    }

    return createResponse(false, "動画が見つかりませんでした", null, 404);
  } finally {
    setLock(spreadsheet, false);
  }
}

/**
 * 動画のsingingカラムをfalseにして、紐づく歌唱パートを削除
 * @param {Spreadsheet} spreadsheet
 * @param {string} videoId
 * @returns
 */
function setSingingFalse(spreadsheet, videoId) {
  try {
    setLock(spreadsheet, true);

    if (!videoId) {
      return createResponse(false, "video_idが指定されていません", null, 400);
    }

    const videoSheet = spreadsheet.getSheetByName(VIDEOS_SHEET_NAME);
    const videoData = videoSheet.getDataRange().getValues();
    const videoHeaders = videoData[0];
    const videoIdIndex = videoHeaders.indexOf("video_id");
    const singingIndex = videoHeaders.indexOf("singing");

    // 動画を検索してsingingをfalse、completedをtrueに更新
    let videoFound = false;
    for (let i = 1; i < videoData.length; i++) {
      if (videoData[i][videoIdIndex] === videoId) {
        videoSheet.getRange(i + 1, singingIndex + 1).setValue(false);
        videoFound = true;
        break;
      }
    }

    if (!videoFound) {
      return createResponse(false, "動画が見つかりませんでした", null, 404);
    }

    // 紐づく歌唱パートを削除
    const songSheet = spreadsheet.getSheetByName(SONGS_SHEET_NAME);
    const songData = songSheet.getDataRange().getValues();
    const songHeaders = songData[0];
    const songVideoIdIndex = songHeaders.indexOf("video_id");

    let deletedCount = 0;
    // 後ろから削除しないとインデックスがずれるため、逆順でループ
    for (let i = songData.length - 1; i >= 1; i--) {
      if (songData[i][songVideoIdIndex] === videoId) {
        songSheet.deleteRow(i + 1);
        deletedCount++;
      }
    }

    logAccess("SET_SINGING_FALSE", videoId, "success");

    return createResponse(true, `singingをfalseに設定し、${deletedCount}曲を削除しました`, {
      video_id: videoId,
      deleted_songs: deletedCount,
    });
  } finally {
    setLock(spreadsheet, false);
  }
}

// ===== ヘルパー関数 =====

// ロック状態をチェック
function isLocked(spreadsheet) {
  const metadataSheet = getOrCreateMetadataSheet(spreadsheet);
  const data = metadataSheet.getDataRange().getValues();

  // locked行を検索
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === "locked") {
      return data[i][1] === true || data[i][1] === "TRUE";
    }
  }

  return false;
}

// ロック状態を設定
function setLock(spreadsheet, locked) {
  const metadataSheet = getOrCreateMetadataSheet(spreadsheet);
  const data = metadataSheet.getDataRange().getValues();

  // locked行を検索して更新
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === "locked") {
      metadataSheet.getRange(i + 1, 2).setValue(locked);
      return;
    }
  }

  // locked行が存在しない場合は追加
  metadataSheet.appendRow(["locked", locked]);
}

// メタデータシートを取得または作成
function getOrCreateMetadataSheet(spreadsheet) {
  let metadataSheet = spreadsheet.getSheetByName(METADATA_SHEET_NAME);

  if (!metadataSheet) {
    metadataSheet = spreadsheet.insertSheet(METADATA_SHEET_NAME);
    metadataSheet.appendRow(["key", "value"]);
    metadataSheet.appendRow(["locked", false]);
  }

  return metadataSheet;
}

// 行データをオブジェクトに変換
function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = row[index];
  });
  return obj;
}

// =で始まるセルの値をエスケープ
function escapeFormula(value) {
  if (typeof value === "string" && value.startsWith("=")) {
    return "'" + value;
  }
  return value;
}

// 動画データのバリデーション
function validateVideo(video) {
  const errors = [];

  // 必須フィールドチェック
  ["video_id", "channel_id", "title", "published_at"].forEach((field) => {
    if (!video[field] || video[field].trim() === "") {
      errors.push(`${field}は必須です`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

// 歌唱データのバリデーション
function validateSong(song) {
  const errors = [];

  // 必須フィールドチェック（最低限titleは必須とする）
  if (!song.title || song.title.trim() === "") {
    errors.push("titleは必須です");
  }

  if (song.start_time && song.start_time < 0) {
    errors.push("start_timeの値が不正です");
  }

  if (song.end_time && song.end_time < 0) {
    errors.push("end_timeの値が不正です");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

// 時刻形式のバリデーション
function isValidTime(time) {
  // MM:SS または HH:MM:SS 形式
  return /^(\d+):([0-5]\d)(:([0-5]\d))?$/.test(time);
}

// APIキーの検証
function validateApiKey(apiKey) {
  return apiKey && getValidApiKeys().includes(apiKey);
}

// レート制限チェック
function checkRateLimit(identifier) {
  const cache = CacheService.getScriptCache();
  const key = `rate_limit_${identifier}`;
  const current = cache.get(key);

  if (current) {
    const count = parseInt(current);
    if (count >= MAX_REQUESTS) {
      return false;
    }
    cache.put(key, count + 1, RATE_LIMIT_MINUTES * 60);
  } else {
    cache.put(key, 1, RATE_LIMIT_MINUTES * 60);
  }

  return true;
}

// アクセスログ
function logAccess(action, songId, result) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = spreadsheet.getSheetByName("AccessLog");

    if (!logSheet) {
      logSheet = spreadsheet.insertSheet("AccessLog");
      logSheet.appendRow(["Timestamp", "Action", "Song ID", "Result"]);
    }

    logSheet.appendRow([new Date(), action, songId, result]);
  } catch (e) {
    console.error("Failed to log access:", e);
  }
}

// エラーログ
function logError(method, error) {
  console.error(`${method} Error:`, error.toString());
  logAccess(method, "error", error.toString());
}

// レスポンス作成
function createResponse(success, message, data = null, statusCode = 200) {
  const response = {
    success: success,
    message: message,
    timestamp: new Date().toISOString(),
    statusCode: statusCode,
  };

  if (data) {
    response.data = data;
  }

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON
  );
}
