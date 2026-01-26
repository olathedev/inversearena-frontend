"use client";

import { useState, useCallback } from "react";
import {
  LeaderboardTable,
  Pagination,
  getPaginatedSurvivors,
  getTotalPages,
} from "@/features/leaderboard";

const ITEMS_PER_PAGE = 4;

export default function LeaderboardPage() {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = getTotalPages(ITEMS_PER_PAGE);
  const paginatedSurvivors = getPaginatedSurvivors(currentPage, ITEMS_PER_PAGE);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleChallenge = useCallback((survivorId: string) => {
    // TODO: connect to smart contract
    console.log("Challenge initiated for survivor:", survivorId);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <LeaderboardTable
        survivors={paginatedSurvivors}
        onChallenge={handleChallenge}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
