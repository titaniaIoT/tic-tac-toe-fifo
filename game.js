let board = ['', '', '', '', '', '', '', '', ''];  // Board state
let currentPlayer = 'X';  // Current player (X or O)
let moveHistoryX = [];  // To keep track of X's moves
let moveHistoryO = [];  // To keep track of O's moves
let countdownTimer;
let timeLeft = 15;  // 15 seconds per player

const turnStatus = document.getElementById('turn-status');
const timerDisplay = document.getElementById('timer-display');

// Start the countdown timer
function startTimer() {
    timeLeft = 15;  // Set the countdown to 15 seconds
    timerDisplay.textContent = timeLeft + 's';

    // Clear any existing timer
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }

    countdownTimer = setInterval(function() {
        timeLeft--;
        timerDisplay.textContent = timeLeft + 's';
        
        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            alert(currentPlayer + "'s time is up! " + currentPlayer + " loses!");
            resetGame();  // Reset the game after time is up and the player loses
        }
    }, 1000);
}

// Switch player after a valid move or after time runs out
function switchPlayer() {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    turnStatus.textContent = 'Lượt chơi của: ' + currentPlayer;
    startTimer();  // Restart the timer when switching turns
}

// Make a move on the board
function makeMove(index) {
    if (board[index] === '') {
        // Record the move
        board[index] = currentPlayer;

        if (currentPlayer === 'X') {
            moveHistoryX.push(index);  // Record X's move
            // If X has more than 3 moves, remove the first one
            if (moveHistoryX.length > 3) {
                const firstMoveIndex = moveHistoryX.shift();  // Remove first X move
                board[firstMoveIndex] = '';  // Clear the cell
            }
        } else {
            moveHistoryO.push(index);  // Record O's move
            // If O has more than 3 moves, remove the first one
            if (moveHistoryO.length > 3) {
                const firstMoveIndex = moveHistoryO.shift();  // Remove first O move
                board[firstMoveIndex] = '';  // Clear the cell
            }
        }

        // Update the board visually
        renderBoard();

        // Check for winner or draw
        if (checkWinner()) {
            setTimeout(() => alert(currentPlayer + ' wins!'), 100);
            clearInterval(countdownTimer);  // Stop the timer when game ends
            return;
        }

        // Check for draw
        if (board.every(cell => cell !== '')) {
            setTimeout(() => alert('It\'s a draw!'), 100);
            clearInterval(countdownTimer);  // Stop the timer when game ends
            return;
        }

        // Change player
        switchPlayer();
    }
}

// Render the board
function renderBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        cell.textContent = board[index];
        if (board[index] === 'X') {
            cell.classList.add('X');  // Add class X for red
        } else if (board[index] === 'O') {
            cell.classList.add('O');  // Add class O for green
        } else {
            cell.classList.remove('X', 'O');  // Remove class if cell is empty
        }
    });
}

// Check for a winner
function checkWinner() {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],  // Horizontal
        [0, 3, 6], [1, 4, 7], [2, 5, 8],  // Vertical
        [0, 4, 8], [2, 4, 6]               // Diagonal
    ];

    return winPatterns.some(pattern => {
        const [a, b, c] = pattern;
        return board[a] && board[a] === board[b] && board[a] === board[c];
    });
}

// Reset the game
function resetGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    moveHistoryX = [];
    moveHistoryO = [];
    currentPlayer = 'X';
    turnStatus.textContent = 'Lượt chơi của: X';
    renderBoard();
    clearInterval(countdownTimer);  // Clear the timer on reset
    startTimer();  // Restart the timer after reset
}

// Initial timer start
startTimer();