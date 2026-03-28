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

let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let moveHistoryX = [];
let moveHistoryO = [];
let countdownTimer;
let timeLeft = 15;
let myRole = null; // 'X', 'O' hoặc 'viewer'
let currentRoomId = null;

const turnStatus = document.getElementById('turn-status');
const timerDisplay = document.getElementById('timer-display');
const playerRoleDisplay = document.getElementById('player-role');
const roomDisplay = document.getElementById('room-display');

// Tham gia phòng
function joinRoom() {
    const roomId = document.getElementById('room-id-input').value.trim();
    if (!roomId) return alert("Vui lòng nhập mã phòng!");
    
    currentRoomId = roomId;
    const roomRef = database.ref('rooms/' + roomId);

    roomRef.once('value').then(snapshot => {
        const data = snapshot.val();
        
        if (!data || !data.playerX) {
            myRole = 'X';
            roomRef.update({ playerX: true, status: 'waiting' });
        } else if (!data.playerO) {
            myRole = 'O';
            roomRef.update({ playerO: true, status: 'playing' });
        } else {
            myRole = 'viewer';
            alert("Phòng đã đầy! Bạn vào với vai trò người xem.");
        }

        playerRoleDisplay.textContent = "Bạn là: " + (myRole === 'viewer' ? "Người xem" : myRole);
        roomDisplay.textContent = "Phòng: " + roomId;
        document.getElementById('room-selection').style.display = 'none';
        document.getElementById('game-ui').style.display = 'block';

        listenToRoom(roomId);
    });
}

// Lắng nghe thay đổi từ Firebase
function listenToRoom(roomId) {
    const roomRef = database.ref('rooms/' + roomId);
    roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        board = data.board || ['', '', '', '', '', '', '', '', ''];
        currentPlayer = data.currentPlayer || 'X';
        moveHistoryX = data.moveHistoryX || [];
        moveHistoryO = data.moveHistoryO || [];
        
        renderBoard();
        updateStatus(data.status);

        if (data.status === 'playing') {
            startTimerLocal();
        } else {
            clearInterval(countdownTimer);
        }
    });
}

function updateStatus(status) {
    if (status === 'waiting') {
        turnStatus.textContent = "Đang chờ người chơi O...";
    } else if (status === 'playing') {
        turnStatus.textContent = "Lượt chơi của: " + currentPlayer;
    } else if (status === 'finished') {
        turnStatus.textContent = "Trận đấu kết thúc!";
    }
}

// Gửi nước đi lên Firebase
function handleMove(index) {
    if (myRole !== currentPlayer) return; // Không phải lượt của bạn
    if (board[index] !== '') return; // Ô đã có người chơi

    const newBoard = [...board];
    newBoard[index] = currentPlayer;

    let newHistoryX = [...moveHistoryX];
    let newHistoryO = [...moveHistoryO];

    if (currentPlayer === 'X') {
        newHistoryX.push(index);
        if (newHistoryX.length > 3) {
            const firstMove = newHistoryX.shift();
            newBoard[firstMove] = '';
        }
    } else {
        newHistoryO.push(index);
        if (newHistoryO.length > 3) {
            const firstMove = newHistoryO.shift();
            newBoard[firstMove] = '';
        }
    }

    const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
    
    const updateData = {
        board: newBoard,
        currentPlayer: nextPlayer,
        moveHistoryX: newHistoryX,
        moveHistoryO: newHistoryO,
        lastUpdate: Date.now()
    };

    if (checkWinnerOnline(newBoard)) {
        updateData.status = 'finished';
        alert(currentPlayer + " thắng!");
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

function checkWinnerOnline(currentBoard) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    return winPatterns.some(p => currentBoard[p[0]] && currentBoard[p[0]] === currentBoard[p[1]] && currentBoard[p[0]] === currentBoard[p[2]]);
}

function startTimerLocal() {
    timeLeft = 15;
    timerDisplay.textContent = timeLeft + 's';
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft + 's';
        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            if (myRole === currentPlayer) {
                alert("Hết thời gian! Bạn đã thua.");
                requestReset();
            }
        }
    }, 1000);
}

function requestReset() {
    database.ref('rooms/' + currentRoomId).update({
        board: ['', '', '', '', '', '', '', '', ''],
        currentPlayer: 'X',
        moveHistoryX: [],
        moveHistoryO: [],
        status: 'playing'
    });
}