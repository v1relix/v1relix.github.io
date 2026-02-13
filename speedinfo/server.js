require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const multer = require('multer');
const upload = multer();
const path = require('path');
const app = express();

// Сессии
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: false
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    // В реальном проекте здесь сохраняем пользователя в БД
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Статика (наш index.html будет лежать в папке public)
app.use(express.static(path.join(__dirname, 'public')));

// Маршруты аутентификации
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

// API текущего пользователя
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      name: req.user.displayName,
      avatar: req.user.photos?.[0]?.value,
      email: req.user.emails?.[0]?.value
    });
  } else {
    res.json(null);
  }
});

// Тест скорости: загрузка файла (download)
app.get('/api/speedtest/download', (req, res) => {
  const size = parseInt(req.query.size) || 10; // МБ
  const buffer = Buffer.alloc(size * 1024 * 1024, 'a');
  res.set({
    'Content-Type': 'application/octet-stream',
    'Content-Length': buffer.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.send(buffer);
});

// Тест скорости: приём файла (upload)
app.post('/api/speedtest/upload', upload.single('file'), (req, res) => {
  res.json({ status: 'ok' });
});

// Ping
app.head('/api/speedtest/ping', (req, res) => {
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SpeedInfo™ сервер запущен на http://localhost:${PORT}`));