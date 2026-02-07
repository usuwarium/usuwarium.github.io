import { SideMenu } from "@/components/SideMenu";
import { Splash } from "@/components/Splash";
import { AboutPage } from "@/pages/AboutPage";
import { ArchivePage } from "@/pages/ArchivePage";
import { ManagePage } from "@/pages/ManagePage";
import { PlaylistPage } from "@/pages/PlaylistPage";
import { SongsPage } from "@/pages/SongsPage";
import { StatisticsPage } from "@/pages/StatisticsPage";
import { TopPage } from "@/pages/TopPage";
import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import { FetchDataContext, useFetchData } from "./hooks/useFetchData";
import { GAS_API_KEY } from "./lib/gas-client";
import { YOUTUBE_API_KEY } from "./lib/manage";
import { ManageAuthPage } from "./pages/ManageAuthPage";

function App() {
  const { isDataStored, loading, error } = useFetchData();
  const [showSplash, setShowSplash] = useState(() => {
    // localStorageのlastUpdatedAtがない場合にスプラッシュを表示
    return !localStorage.getItem("lastUpdatedAt");
  });

  // 管理画面認証状態の判定
  const storedKey = localStorage.getItem(YOUTUBE_API_KEY);
  const storedGasKey = localStorage.getItem(GAS_API_KEY);
  const authenticated = !!storedKey && !!storedGasKey;

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  useEffect(() => {
    let id = null;
    if (error) {
      id = toast.error("データのダウンロードに失敗しました");
    }
    return () => {
      if (id) {
        toast.dismiss(id);
      }
    };
  }, [error]);

  if (showSplash) {
    return <Splash onComplete={handleSplashComplete} />;
  }

  return (
    <FetchDataContext.Provider value={{ isDataStored, loading }}>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/manage" element={authenticated ? <ManagePage /> : <ManageAuthPage />} />
        <Route
          path="*"
          element={
            <div id="container" className="layout">
              <SideMenu />
              <Routes>
                <Route path="/" element={<TopPage />} />
                <Route path="/archives" element={<ArchivePage />} />
                <Route path="/songs" element={<SongsPage />} />
                <Route path="/playlist" element={<PlaylistPage />} />
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/about" element={<AboutPage />} />
              </Routes>
            </div>
          }
        />
      </Routes>
    </FetchDataContext.Provider>
  );
}

export default App;
