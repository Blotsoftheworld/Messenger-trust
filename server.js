const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Хранилище в памяти (для простоты, можно заменить на файлы)
let users = [];
let messages = {};

// Отдаём HTML мессенджера
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Регистрация
app.post('/api/register', (req, res) => {
    const { nick, email, password } = req.body;
    
    if (users.find(u => u.nick === nick)) {
        return res.status(400).json({ error: 'Никнейм занят' });
    }
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Почта уже используется' });
    }
    
    const user = { nick, email, password, avatarColor: '#7c3aed', status: 'В сети', bio: '', friends: [] };
    users.push(user);
    res.json(user);
});

// Вход
app.post('/api/login', (req, res) => {
    const { nick, email, password } = req.body;
    const user = users.find(u => u.nick === nick && u.email === email && u.password === password);
    
    if (!user) return res.status(401).json({ error: 'Неверные данные' });
    res.json(user);
});

// Получить пользователя
app.get('/api/user/:nick', (req, res) => {
    const user = users.find(u => u.nick === req.params.nick);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(user);
});

// Обновить пользователя
app.put('/api/user/:nick', (req, res) => {
    const idx = users.findIndex(u => u.nick === req.params.nick);
    if (idx === -1) return res.status(404).json({ error: 'Пользователь не найден' });
    
    users[idx] = { ...users[idx], ...req.body };
    res.json(users[idx]);
});

// Добавить друга
app.post('/api/friends', (req, res) => {
    const { userNick, friendNick } = req.body;
    const user = users.find(u => u.nick === userNick);
    const friend = users.find(u => u.nick === friendNick);
    
    if (!user || !friend) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    if (!user.friends.includes(friendNick)) user.friends.push(friendNick);
    if (!friend.friends.includes(userNick)) friend.friends.push(userNick);
    
    res.json({ success: true });
});

// Отправить сообщение
app.post('/api/messages', (req, res) => {
    const { from, to, text } = req.body;
    const chatId = [from, to].sort().join('___');
    
    if (!messages[chatId]) messages[chatId] = [];
    messages[chatId].push({ from, to, text, time: new Date().toISOString() });
    res.json(messages[chatId]);
});

// Получить сообщения
app.get('/api/messages/:user1/:user2', (req, res) => {
    const chatId = [req.params.user1, req.params.user2].sort().join('___');
    res.json(messages[chatId] || []);
});

// Получить чаты пользователя
app.get('/api/chats/:nick', (req, res) => {
    const nick = req.params.nick;
    const chats = [];
    const processed = new Set();
    
    for (const [chatId, msgs] of Object.entries(messages)) {
        const parts = chatId.split('___');
        if (parts.includes(nick) && msgs.length > 0) {
            const partner = parts[0] === nick ? parts[1] : parts[0];
            processed.add(partner);
            const last = msgs[msgs.length - 1];
            chats.push({ partner, lastMsg: last.text, time: last.time });
        }
    }
    
    const user = users.find(u => u.nick === nick);
    if (user?.friends) {
        for (const friend of user.friends) {
            if (!processed.has(friend)) {
                chats.push({ partner: friend, lastMsg: 'Начните общение!', time: '' });
            }
        }
    }
    
    res.json(chats);
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});