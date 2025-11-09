import { useState, useEffect } from 'react';
import './App.css';
import ChatEmotionApp from './components/ChatEmotionApp';

function App() {
  const [theme, setTheme] = useState('light');
  
  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Set initial theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <div className={`app ${theme}-theme`}>
      <header className="app-header">
        <div className="header-content">
          <h1>Emotion Detector</h1>
          <button 
            className="theme-toggle" 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
        <p className="subtitle">Express yourself and discover emotions in your messages</p>
      </header>
      
      <main>
        <ChatEmotionApp />
      </main>
      
      <footer>
        <div className="footer-content">
          <p>© {new Date().getFullYear()} Emotion Detector </p>
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy</a>
            <span className="divider">•</span>
            <a href="#" className="footer-link">Terms</a>
            <span className="divider">•</span>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
