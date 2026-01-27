import { useRef, type RefObject } from "react";
import { BsThreeDots } from "react-icons/bs";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scrollTargetRef?: RefObject<HTMLElement | null>;
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  scrollTargetRef,
}: PaginationProps) => {
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);

  const handlePageChange = (page: number) => {
    onPageChange(page);
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
    timerIdRef.current = setTimeout(() => {
      if (scrollTargetRef?.current) {
        scrollTargetRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
      timerIdRef.current = null;
    }, 100);
  };

  if (totalPages <= 0) {
    return null;
  }

  const generatePageNumbers = (): (number | string)[] => {
    const maxSlots = 7; // 固定スロット数
    const collapceThreshold = 4; // 省略記号を表示する最低ページ数(1ページ目+2ページ以上で省略)

    if (totalPages <= maxSlots) {
      // 全ページ表示
      return [...new Array(totalPages).keys()].map((_, i) => i + 1);
    } else if (currentPage <= collapceThreshold) {
      // 先頭付近
      return [1, 2, 3, 4, 5, "...", totalPages];
    } else if (currentPage > totalPages - collapceThreshold) {
      // 末尾付近
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      // 中間
      return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
    }
  };

  const pageNumbers = generatePageNumbers();

  return (
    <div className="flex items-center justify-center gap-2 min-h-[52px]">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 rounded-lg border border-gray-600 text-gray-300 text-xs hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        前へ
      </button>

      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) => {
          if (page === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="w-9 py-2 text-gray-400 flex justify-center"
              >
                <BsThreeDots />
              </span>
            );
          }

          return (
            <button
              key={page}
              onClick={() => handlePageChange(page as number)}
              className={`w-9 py-2 rounded-lg transition-colors text-xs text-center ${
                currentPage === page
                  ? "border border-gray-600 bg-gray-600 text-white"
                  : "border border-gray-600 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 rounded-lg border border-gray-600 text-gray-300 text-xs hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        次へ
      </button>
    </div>
  );
};
