import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import TranscriptionPage from "./pages/TranscriptionPage";
import AdminPage from "./pages/AdminPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import ProfilePage from "./pages/ProfilePage";
import CookieConsent from "./components/CookieConsent";
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <HelmetProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <div className="App">
              <Toaster position="top-right" richColors />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route
                  path="/dashboard"
                  element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
                />
                <Route
                  path="/transcription/:id"
                  element={<ProtectedRoute><TranscriptionPage /></ProtectedRoute>}
                />
                <Route
                  path="/admin"
                  element={<ProtectedRoute><AdminPage /></ProtectedRoute>}
                />
                <Route
                  path="/profile"
                  element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
                />
              </Routes>
              <CookieConsent />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </HelmetProvider>
  );
}

export default App;
