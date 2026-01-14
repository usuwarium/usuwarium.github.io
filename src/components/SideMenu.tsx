import { Link, useLocation } from "react-router-dom";
import { BiSolidDashboard, BiSolidVideos, BiSolidPlaylist } from "react-icons/bi";
import { FaQuestionCircle } from "react-icons/fa";
import { FaYoutube, FaXTwitter } from "react-icons/fa6";
import { IoMdMusicalNote } from "react-icons/io";
import { IoStatsChart } from "react-icons/io5";
import { BsThreeDots } from "react-icons/bs";
import { useState } from "react";

const pages = [
  {
    path: "/",
    icon: <BiSolidDashboard size={24} />,
    label: "Top",
  },
  {
    path: "/archives",
    icon: <BiSolidVideos size={24} />,
    label: "Archives",
  },
  {
    path: "/songs",
    icon: <IoMdMusicalNote size={24} />,
    label: "Songs",
  },
  {
    path: "/playlist",
    icon: <BiSolidPlaylist size={24} />,
    label: "Playlist",
  },
  {
    path: "/statistics",
    icon: <IoStatsChart size={24} />,
    label: "Statistics",
  },
  {
    path: "/about",
    icon: <FaQuestionCircle size={24} />,
    label: "About",
  },
];

export function SideMenu() {
  const location = useLocation();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  return (
    <aside className="side-menu flex flex-col z-100">
      <nav className="h-full">
        <ul className="nav-list">
          {pages.slice(0, 4).map((page) => (
            <li key={page.path} className="w-full">
              <Link
                to={page.path}
                onClick={() => setIsMoreMenuOpen(false)}
                className={`nav-item ${location.pathname === page.path && "nav-item-selected"}`}
              >
                {page.icon}
                <span className="text-[.8rem]">{page.label}</span>
              </Link>
            </li>
          ))}

          <li className="nav-more w-full">
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="more-button nav-item"
            >
              <BsThreeDots size={24} />
              <span className="sr-only">その他メニュー</span>
            </button>

            <ul
              className={`more-menu nav-list ${
                isMoreMenuOpen ? "more-menu-open" : "more-menu-hidden"
              }`}
            >
              {pages.slice(4).map((page) => (
                <li key={page.path} className="w-full">
                  <Link
                    to={page.path}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className={`nav-item ${
                      location.pathname === page.path ? "nav-item-selected" : ""
                    }`}
                  >
                    {page.icon}
                    <span className="text-[.8rem]">{page.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
