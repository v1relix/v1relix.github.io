require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const multer = require('multer');
const upload = multer();
const path = require('path');
const crypto = require('crypto');

const app = express();

// Настройка сессий
app.use(session({
  secret: process.env.SESSION_SECRET,
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
    // В реальном проекте здесь нужно сохранять пользователя в БД
    // Пока просто передаём профиль
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Статические файлы
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

// API для получения данных текущего пользователя
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

// Тест скорости: загрузка файла для Download
app.get('/api/speedtest/download', (req, res) => {
  const size = parseInt(req.query.size) || 10; // по умолчанию 10 МБ
  const buffer = Buffer.alloc(size * 1024 * 1024, 'a'); // заполняем 'a'
  res.set({
    'Content-Type': 'application/octet-stream',
    'Content-Length': buffer.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.send(buffer);
});

// Тест скорости: приём файла для Upload
app.post('/api/speedtest/upload', upload.single('file'), (req, res) => {
  // Файл уже загружен в память через multer, просто отвечаем OK
  res.json({ status: 'ok' });
});

// Ping (задержка)
app.head('/api/speedtest/ping', (req, res) => {
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));