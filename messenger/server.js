const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const DB_FILE = path.join(__dirname, 'data.json');

// Загружаем или создаём базу
function loadDB() {
    try {
        if (fs.existsSync(DB_FILE)) {
            return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        }
    } catch(e) {}
    return { users: {}, messages: {} };
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Регистрация
app.post('/api/register', (req, res) => {
    const { nick, pass } = req.body;
    const db = loadDB();
    if (db.users[nick]) return res.status(400).json({ error: 'Никнейм занят' });
    db.users[nick] = { nick, pass, color: '#6c5ce7', friends: [], createdAt: Date.now() };
    saveDB(db);
    res.json({ ok: true });
});

// Вход
app.post('/api/login', (req, res) => {
    const { nick, pass } = req.body;
    const db = loadDB();
    const user = db.users[nick];
    if (!user || user.pass !== pass) return res.status(401).json({ error: 'Неверные данные' });
    res.json(user);
});

// Получить пользователя
app.get('/api/user/:nick', (req, res) => {
    const db = loadDB();
    const user = db.users[req.params.nick];
    if (!user) return res.status(404).json({ error: 'Не найден' });
    res.json(user);
});

// Обновить пользователя
app.put('/api/user/:nick', (req, res) => {
    const db = loadDB();
    if (!db.users[req.params.nick]) return res.status(404).json({ error: 'Не найден' });
    db.users[req.params.nick] = { ...db.users[req.params.nick], ...req.body };
    saveDB(db);
    res.json(db.users[req.params.nick]);
});

// Добавить друга
app.post('/api/friends', (req, res) => {
    const { nick, friend } = req.body;
    const db = loadDB();
    if (!db.users[nick] || !db.users[friend]) return res.status(404).json({ error: 'Не найден' });
    if (!db.users[nick].friends) db.users[nick].friends = [];
    if (!db.users[friend].friends) db.users[friend].friends = [];
    if (!db.users[nick].friends.includes(friend)) db.users[nick].friends.push(friend);
    if (!db.users[friend].friends.includes(nick)) db.users[friend].friends.push(nick);
    saveDB(db);
    res.json({ ok: true });
});

// Отправить сообщение
app.post('/api/messages', (req, res) => {
    const { from, to, text } = req.body;
    const db = loadDB();
    const chatId = [from, to].sort().join('_');
    if (!db.messages[chatId]) db.messages[chatId] = [];
    db.messages[chatId].push({ from, text, time: Date.now() });
    saveDB(db);
    res.json({ ok: true });
});

// Получить сообщения
app.get('/api/messages/:user1/:user2', (req, res) => {
    const db = loadDB();
    const chatId = [req.params.user1, req.params.user2].sort().join('_');
    res.json(db.messages[chatId] || []);
});

// Получить чаты пользователя
app.get('/api/chats/:nick', (req, res) => {
    const db = loadDB();
    const chats = [];
    if (db.messages) {
        Object.entries(db.messages).forEach(([id, msgs]) => {
            if (id.includes(req.params.nick) && msgs.length > 0) {
                const partner = id.split('_').find(x => x !== req.params.nick);
                const last = msgs[msgs.length - 1];
                chats.push({ partner, last: last.text, time: last.time });
            }
        });
    }
    const user = db.users[req.params.nick];
    if (user?.friends) {
        user.friends.forEach(f => {
            if (!chats.find(c => c.partner === f)) chats.push({ partner: f, last: 'Начните общение', time: 0 });
        });
    }
    chats.sort((a, b) => b.time - a.time);
    res.json(chats);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Сервер запущен на порту ' + PORT));