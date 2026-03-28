// CẤU HÌNH FIREBASE - Thay thế bằng thông tin từ Firebase Console của bạn
const firebaseConfig = {
    apiKey: "AIzaSyD8-RvPgMyCLiuRKSF6EImaKikrx1xZIoQ",
    authDomain: "tictactoe-9e420.firebaseapp.com",
    databaseURL: "https://tictactoe-9e420-default-rtdb.firebaseio.com",
    projectId: "tictactoe-9e420",
    storageBucket: "tictactoe-9e420.firebasestorage.app",
    messagingSenderId: "626993248199",
    appId: "1:626993248199:web:4d17857904aa4348b48be2",
    measurementId: "G-CKLL9Y8K2Q"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Biến toàn cục
let myUsername = "";
let myRole = null; // 'X' hoặc 'O'
let currentRoomId = null;
let board = Array(9).fill('');
let currentPlayer = 'X';
let countdownTimer;
let moveHistoryX = [];
let moveHistoryO = [];

// DOM Elements
const lobbyUI = document.getElementById('lobby-ui');
const gameUI = document.getElementById('game-ui');
const roomListDiv = document.getElementById('room-list');

// --- 1. LOGIN & LOBBY ---

function login() {
    const input = document.getElementById('username-input');
    myUsername = input.value.trim();
    if (!myUsername) return alert("Vui lòng nhập tên!");
    
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('welcome-text').textContent = `Xin chào, ${myUsername}`;
    lobbyUI.style.display = 'block';
    
    listenToLobby();
}

function listenToLobby() {
    database.ref('rooms').on('value', (snapshot) => {
        const rooms = snapshot.val();
        roomListDiv.innerHTML = "";
        
        if (!rooms) {
            roomListDiv.innerHTML = "<p>Chưa có phòng nào. Hãy tạo phòng mới!</p>";
            return;
        }

        Object.keys(rooms).forEach(roomId => {
            const room = rooms[roomId];
            const count = (room.playerX ? 1 : 0) + (room.playerO ? 1 : 0);
            
            const roomEl = document.createElement('div');
            roomEl.className = 'room-item';
            roomEl.innerHTML = `
                <span>Phòng: ${roomId} (${count}/2)</span>
                <button onclick="joinRoom('${roomId}')" ${count >= 2 ? 'disabled' : ''}>
                    ${count >= 2 ? 'Đầy' : 'Vào chơi'}
                </button>
            `;
            roomListDiv.appendChild(roomEl);
        });
    });
}

function createRoom() {
    const roomId = Math.floor(1000 + Math.random() * 9000).toString();
    const newRoom = {
        playerX: { name: myUsername },
        status: 'waiting',
        board: Array(9).fill(''),
        currentPlayer: 'X',
        moveHistoryX: [],
        moveHistoryO: []
    };

    database.ref('rooms/' + roomId).set(newRoom).then(() => {
        enterRoom(roomId, 'X');
    });
}

function joinRoom(roomId) {
    const roomRef = database.ref('rooms/' + roomId);
    roomRef.once('value', (snapshot) => {
        const room = snapshot.val();
        if (!room) return;

        if (!room.playerO) {
            roomRef.update({
                playerO: { name: myUsername },
                status: 'playing'
            }).then(() => {
                enterRoom(roomId, 'O');
            });
        }
    });
}

function enterRoom(roomId, role) {
    currentRoomId = roomId;
    myRole = role;
    
    lobbyUI.style.display = 'none';
    gameUI.style.display = 'block';
    document.getElementById('room-display').textContent = `Phòng: ${roomId}`;
    
    listenToRoom(roomId);
}

function backToLobby() {
    if (!currentRoomId) return;
    
    const roomRef = database.ref('rooms/' + currentRoomId);
    roomRef.off(); // Ngừng lắng nghe room cũ
    
    // Logic đơn giản: Xóa luôn phòng khi có người thoát (Bạn có thể cải tiến sau)
    roomRef.remove(); 
    
    currentRoomId = null;
    gameUI.style.display = 'none';
    lobbyUI.style.display = 'block';
    clearInterval(countdownTimer);
}

// --- 2. GAME LOGIC ---

function listenToRoom(roomId) {
    database.ref('rooms/' + roomId).on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        board = data.board || Array(9).fill('');
        currentPlayer = data.currentPlayer || 'X';
        moveHistoryX = data.moveHistoryX || [];
        moveHistoryO = data.moveHistoryO || [];

        // Cập nhật giao diện tên người chơi
        document.getElementById('name-x').textContent = data.playerX ? data.playerX.name : "Đang chờ...";
        document.getElementById('name-o').textContent = data.playerO ? data.playerO.name : "Đang chờ...";
        
        // Highlight người đang đến lượt
        document.getElementById('info-x').classList.toggle('active', currentPlayer === 'X');
        document.getElementById('info-o').classList.toggle('active', currentPlayer === 'O');

        renderBoard();

        if (data.status === 'playing') {
            document.getElementById('turn-status').textContent = `Lượt chơi của: ${currentPlayer === 'X' ? data.playerX.name : data.playerO.name}`;
            startTimerLocal();
        } else if (data.status === 'waiting') {
            document.getElementById('turn-status').textContent = "Đang chờ người chơi O...";
        } else if (data.status === 'finished') {
            document.getElementById('turn-status').textContent = "Kết thúc!";
            clearInterval(countdownTimer);
        }
    });
}

function handleMove(index) {
    if (myRole !== currentPlayer) return;
    if (board[index] !== '') return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;

    let newHistoryX = [...moveHistoryX];
    let newHistoryO = [...moveHistoryO];

    if (currentPlayer === 'X') {
        newHistoryX.push(index);
        if (newHistoryX.length > 3) {
            const first = newHistoryX.shift();
            newBoard[first] = '';
        }
    } else {
        newHistoryO.push(index);
        if (newHistoryO.length > 3) {
            const first = newHistoryO.shift();
            newBoard[first] = '';
        }
    }

    const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
    const updateData = {
        board: newBoard,
        currentPlayer: nextPlayer,
        moveHistoryX: newHistoryX,
        moveHistoryO: newHistoryO
    };

    if (checkWinnerOnline(newBoard)) {
        updateData.status = 'finished';
        alert(`${myUsername} thắng!`);
    }

    database.ref('rooms/' + currentRoomId).update(updateData);
}

function renderBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        cell.textContent = board[index];
        cell.className = 'cell ' + (board[index] || '');
    });
}

function checkWinnerOnline(b) {
    const p = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return p.some(x => b[x[0]] && b[x[0]] === b[x[1]] && b[x[0]] === b[x[2]]);
}

function startTimerLocal() {
    let timeLeft = 15;
    document.getElementById('timer-display').textContent = timeLeft + 's';
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-display').textContent = timeLeft + 's';
        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            if (myRole === currentPlayer) {
                alert("Hết thời gian! Bạn thua.");
                requestReset();
            }
        }
    }, 1000);
}

function requestReset() {
    database.ref('rooms/' + currentRoomId).update({
        board: Array(9).fill(''),
        currentPlayer: 'X',
        moveHistoryX: [],
        moveHistoryO: [],
        status: 'playing'
    });
}