// CẤU HÌNH FIREBASE
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

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let myUsername = "";
let myRole = null; 
let currentRoomId = null;
let board = Array(9).fill('');
let currentPlayer = 'X';
let countdownTimer;
let moveHistoryX = [];
let moveHistoryO = [];
let currentRoomStatus = 'waiting';
let isMeReady = false;

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
            const pX = room.playerX;
            const pO = room.playerO;
            
            // Đếm số người trong phòng (với logic mới, ai offline là bị xóa node luôn)
            const count = (pX ? 1 : 0) + (pO ? 1 : 0);

            // Dọn dẹp phòng trống: Nếu không còn ai
            if (count === 0) {
                database.ref('rooms/' + roomId).remove();
                return;
            }

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
        playerX: { name: myUsername, ready: false },
        status: 'waiting',
        board: Array(9).fill(''),
        currentPlayer: 'X',
        moveHistoryX: [],
        moveHistoryO: []
    };
    database.ref('rooms/' + roomId).set(newRoom).then(() => enterRoom(roomId, 'X'));
}

function joinRoom(roomId) {
    const roomRef = database.ref('rooms/' + roomId);
    roomRef.once('value', (snapshot) => {
        const room = snapshot.val();
        if (!room) return;

        let role = null;
        if (!room.playerX) role = 'X';
        else if (!room.playerO) role = 'O';

        if (role) {
            const updateData = {};
            updateData[`player${role}`] = { name: myUsername, ready: false };
            roomRef.update(updateData).then(() => enterRoom(roomId, role));
        } else {
            alert("Phòng đã đầy!");
        }
    });
}

function enterRoom(roomId, role) {
    currentRoomId = roomId;
    myRole = role;
    lobbyUI.style.display = 'none';
    gameUI.style.display = 'block';
    document.getElementById('room-display').textContent = `Phòng: ${roomId}`;
    
    // Thiết lập tự động xóa node người chơi khi mất kết nối/đóng trình duyệt
    const myPlayerRef = database.ref(`rooms/${roomId}/player${role}`);
    myPlayerRef.onDisconnect().remove();

    listenToRoom(roomId);
}

function backToLobby() {
    if (!currentRoomId) return;

    if (currentRoomStatus === 'playing') {
        alert("Trận đấu đang diễn ra, bạn không thể thoát!");
        return;
    }

    if (isMeReady) {
        alert("Vui lòng hủy sẵn sàng trước khi thoát phòng!");
        return;
    }

    const roomRef = database.ref('rooms/' + currentRoomId);
    roomRef.once('value').then(snapshot => {
        const data = snapshot.val();
        if (data) {
            const isLastPlayer = (myRole === 'X' ? !data.playerO : !data.playerX);
            if (isLastPlayer) {
                roomRef.remove();
            } else {
                const updates = {};
                updates[`player${myRole}`] = null;
                updates.status = 'waiting';
                roomRef.update(updates);
            }
        }
        roomRef.off();
        currentRoomId = null;
        gameUI.style.display = 'none';
        lobbyUI.style.display = 'block';
        clearInterval(countdownTimer);
    });
}

// --- 2. READY LOGIC ---

function toggleReady() {
    if (isMeReady) return;
    database.ref(`rooms/${currentRoomId}/player${myRole}`).update({ ready: true });
}

// --- 3. GAME LOGIC ---

function listenToRoom(roomId) {
    const roomRef = database.ref('rooms/' + roomId);
    roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const pX = data.playerX;
        const pO = data.playerO;
        const opponent = (myRole === 'X' ? pO : pX);

        // TRƯỜNG HỢP ĐỐI THỦ THOÁT KHI ĐANG CHƠI -> RESET PHÒNG NGAY LẬP TỨC
        if (currentRoomStatus === 'playing' && !opponent) {
            clearInterval(countdownTimer);
            const updates = {
                status: 'waiting',
                board: Array(9).fill(''),
                currentPlayer: 'X',
                moveHistoryX: [],
                moveHistoryO: []
            };
            updates[`player${myRole}/ready`] = false; // Reset trạng thái sẵn sàng của bản thân
            roomRef.update(updates);
            alert("Đối thủ đã rời khỏi phòng. Trận đấu bị hủy và đã reset!");
            return;
        }

        board = data.board || Array(9).fill('');
        currentPlayer = data.currentPlayer || 'X';
        moveHistoryX = data.moveHistoryX || [];
        moveHistoryO = data.moveHistoryO || [];
        currentRoomStatus = data.status || 'waiting';

        // HIỂN THỊ TÊN VÀ TRẠNG THÁI
        document.getElementById('name-x').textContent = pX ? pX.name : "Đang chờ...";
        document.getElementById('name-o').textContent = pO ? pO.name : "Đang chờ...";
        
        const readyX = pX && pX.ready;
        const readyO = pO && pO.ready;
        isMeReady = (myRole === 'X' ? readyX : readyO);

        document.getElementById('ready-x').textContent = readyX ? "Đã sẵn sàng" : "Chưa sẵn sàng";
        document.getElementById('ready-x').className = "ready-status" + (readyX ? " is-ready" : "");
        document.getElementById('ready-o').textContent = readyO ? "Đã sẵn sàng" : "Chưa sẵn sàng";
        document.getElementById('ready-o').className = "ready-status" + (readyO ? " is-ready" : "");

        // TỰ ĐỘNG BẮT ĐẦU KHI ĐỦ 2 NGƯỜI SẴN SÀNG
        if ((currentRoomStatus === 'waiting' || currentRoomStatus === 'finished') && pX && pO && pX.ready && pO.ready) {
            roomRef.update({
                status: 'playing',
                board: Array(9).fill(''),
                currentPlayer: 'X',
                moveHistoryX: [],
                moveHistoryO: []
            });
        }

        // UI NÚT BẤM
        const readyBtn = document.getElementById('ready-btn');
        const backBtn = document.querySelector('.btn-back');
        const hasTwoPlayers = pX && pO;

        if (currentRoomStatus === 'playing') {
            readyBtn.style.display = 'none';
            backBtn.style.display = 'none';
            document.getElementById('timer-display').style.display = 'block';
        } else {
            readyBtn.style.display = 'block';
            backBtn.style.display = 'block';
            document.getElementById('timer-display').style.display = 'none';
            readyBtn.textContent = isMeReady ? "Đã sẵn sàng" : "Sẵn sàng";
            readyBtn.className = isMeReady ? "active" : "";
            readyBtn.disabled = isMeReady;
        }

        // WINNER UI
        document.getElementById('info-x').classList.remove('winner-flash');
        document.getElementById('info-o').classList.remove('winner-flash');
        document.getElementById('info-x').classList.toggle('active', currentPlayer === 'X' && currentRoomStatus === 'playing');
        document.getElementById('info-o').classList.toggle('active', currentPlayer === 'O' && currentRoomStatus === 'playing');

        renderBoard();

        if (currentRoomStatus === 'playing') {
            document.getElementById('turn-status').textContent = `Lượt chơi của: ${currentPlayer === 'X' ? pX.name : pO.name}`;
            startTimerLocal();
        } else if (currentRoomStatus === 'waiting') {
            document.getElementById('turn-status').textContent = "Hãy sẵn sàng để bắt đầu!";
        } else if (currentRoomStatus === 'finished') {
            clearInterval(countdownTimer);
            const winnerMark = getWinnerMark(board);
            if (winnerMark === 'X') {
                document.getElementById('info-x').classList.add('winner-flash');
                document.getElementById('turn-status').textContent = `Chiến thắng: ${pX.name}!`;
            } else if (winnerMark === 'O') {
                document.getElementById('info-o').classList.add('winner-flash');
                document.getElementById('turn-status').textContent = `Chiến thắng: ${pO.name}!`;
            } else {
                document.getElementById('turn-status').textContent = "Hòa!";
            }
        }
    });
}

function handleMove(index) {
    if (currentRoomStatus !== 'playing' || myRole !== currentPlayer || board[index] !== '') return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    let newHistoryX = [...moveHistoryX];
    let newHistoryO = [...moveHistoryO];

    if (currentPlayer === 'X') {
        newHistoryX.push(index);
        if (newHistoryX.length > 3) newBoard[newHistoryX.shift()] = '';
    } else {
        newHistoryO.push(index);
        if (newHistoryO.length > 3) newBoard[newHistoryO.shift()] = '';
    }

    const updateData = {
        board: newBoard,
        currentPlayer: currentPlayer === 'X' ? 'O' : 'X',
        moveHistoryX: newHistoryX,
        moveHistoryO: newHistoryO
    };

    if (getWinnerMark(newBoard)) {
        updateData.status = 'finished';
        updateData['playerX/ready'] = false;
        updateData['playerO/ready'] = false;
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

function getWinnerMark(b) {
    const p = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let x of p) if (b[x[0]] && b[x[0]] === b[x[1]] && b[x[0]] === b[x[2]]) return b[x[0]];
    return null;
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
                const roomRef = database.ref('rooms/' + currentRoomId);
                roomRef.update({
                    status: 'finished',
                    'playerX/ready': false,
                    'playerO/ready': false
                });
                alert("Hết thời gian! Bạn thua.");
            }
        }
    }, 1000);
}