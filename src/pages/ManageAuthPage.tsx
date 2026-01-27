import { GAS_API_KEY } from "@/lib/gas-client";
import { YOUTUBE_API_KEY } from "@/lib/manage";
import { useState } from "react";
import { GiSwan } from "react-icons/gi";

/*
 * 管理画面用キー入力コンポーネント
 */
export function ManageAuthPage() {
  const [apiKey, setApiKey] = useState("");
  const [gasApiKey, setGasApiKey] = useState("");

  const handleAuthenticate = () => {
    if (!apiKey.trim()) {
      alert("YouTube APIキーを入力してください");
      return;
    }
    if (!gasApiKey.trim()) {
      alert("GAS APIキーを入力してください");
      return;
    }
    localStorage.setItem(YOUTUBE_API_KEY, apiKey);
    localStorage.setItem(GAS_API_KEY, gasApiKey);
    window.location.reload();
  };

  return (
    <main className="flex-1 flex items-center justify-center min-h-screen">
      <div className="max-w-md w-full p-8 bg-gray-800 rounded-lg shadow-xl">
        <div className="flex items-center justify-center mb-6">
          <GiSwan size={48} className="text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">管理ページ</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">YouTube API キー</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 outline-none"
              placeholder="YouTube APIキーを入力"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">GAS API キー</label>
            <input
              type="password"
              value={gasApiKey}
              onChange={(e) => setGasApiKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()}
              className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 outline-none"
              placeholder="GAS APIキーを入力"
            />
          </div>
          <button
            onClick={handleAuthenticate}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition"
          >
            認証
          </button>
        </div>
      </div>
    </main>
  );
}
