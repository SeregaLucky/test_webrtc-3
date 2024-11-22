const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const cors = require('cors')


app.use(cors());
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Пользователь подключился');

    socket.on('signal', (data) => {
        socket.broadcast.emit('signal', data);
    });

    socket.on('disconnect', () => {
        console.log('Пользователь отключился');
    });
});

const PORT = process.env.PORT || 3003;
http.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});