import { Routes, Route } from "react-router-dom";
import { SideMenu } from "@/components/SideMenu";
import { TopPage } from "@/pages/TopPage";
import { ArchivePage } from "@/pages/ArchivePage";
import { SongsPage } from "@/pages/SongsPage";
import { PlaylistPage } from "@/pages/PlaylistPage";
import { StatisticsPage } from "@/pages/StatisticsPage";
import { AboutPage } from "@/pages/AboutPage";
import { ManagePage } from "@/pages/ManagePage";
import "./App.css";
import { YOUTUBE_API_KEY } from "./lib/manage";
import { ManageAuthPage } from "./pages/ManageAuthPage";
import { GAS_API_KEY } from "./lib/gas-client";
import { Toaster } from "react-hot-toast";

function App() {
  // 管理画面認証状態の判定
  const storedKey = localStorage.getItem(YOUTUBE_API_KEY);
  const storedGasKey = localStorage.getItem(GAS_API_KEY);
  const authenticated = !!storedKey && !!storedGasKey;

  return (
    <>
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
    </>
  );
}

export default App;
