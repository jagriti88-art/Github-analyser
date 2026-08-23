import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import Compare from "./pages/Compare";
import Leaderboard from "./pages/Leaderboard";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        {/* Permalink form: /r/owner/repo loads a stored analysis. */}
        <Route path="r/:owner/:repo" element={<Home />} />
        <Route path="compare" element={<Compare />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
