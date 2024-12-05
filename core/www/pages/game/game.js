import { getUserName, notificationSocket, router, getUserInfo } from '../../code.js';

let gameMode = null;
let tournamentPlayers = [];

async function getPlayerAvatar(username) {
    const userInfo = await getUserInfo(username);
    return userInfo.avatar_url;
}

async function initializeRandomMatch() {
    const username = await getUserName();
    const userAvatar = await getPlayerAvatar(username);

    const randomMatchModal = document.querySelector('#randomMatchModal .modal-body');
    randomMatchModal.innerHTML = `
        <div class="d-flex align-items-center justify-content-center gap-3 flex-wrap">
            <div class="match-player text-center">
                <img src="${userAvatar}" class="rounded-circle border border-danger mb-3" width="80" height="80" alt="${username}">
                <h5 class="mb-3 text-danger">${username}</h5>
            </div>
        </div>
        <div class="d-flex align-items-center justify-content-center gap-2">
            <div class="spinner-border spinner-border-sm text-danger" role="status">
                <span class="visually-hidden">Yükleniyor...</span>
            </div>
            <span class="text-danger">Rakip Bekleniyor...</span>
        </div>
    `;

    await notificationSocket.send(JSON.stringify({
        type: 'random_match',
        username: username,
        title: 'Rastgele Eşleşme',
        message: `${username} eşleşme arıyor`,
        data: {
            gameMode: 'random',
            username: username,
            avatar: userAvatar
        }
    }));
}

async function initializeTournament() {
    const username = await getUserName();
    const userAvatar = await getPlayerAvatar(username);

    updateTournamentPlayersUI();
    updateTournamentStatus('Oyuncular Bekleniyor...');

    await notificationSocket.send(JSON.stringify({
        type: 'tournament_join',
        username: username,
        title: 'Turnuva Katılımı',
        message: `${username} turnuvaya katıldı`,
        data: {
            gameMode: 'tournament',
            username: username,
            avatar: userAvatar
        }
    }));
}

async function startCountdown(roomId, opponent = null) {
    const randomMatchElement = document.querySelector('#randomMatchModal .modal-body');
    const randomMatchModal = document.querySelector('#randomMatchModal');
    const tournamentModal = document.querySelector('#tournamentModal');
    const tournamentMatchElement = document.querySelector('#tournamentModal .modal-body');
    const bsRandomMatchModal = bootstrap.Modal.getInstance(randomMatchModal);
    const bsTournamentModal = bootstrap.Modal.getInstance(tournamentModal);

    if (opponent) {
        const opponentAvatar = await getPlayerAvatar(opponent);
        const username = await getUserName();
        const userAvatar = await getPlayerAvatar(username);

        const matchHTML = `
            <div class="d-flex align-items-center justify-content-center gap-3 flex-wrap">
                <div class="match-player text-center">
                    <img src="${userAvatar}" class="rounded-circle border border-danger mb-3" width="80" height="80" alt="${username}">
                    <h5 class="mb-3 text-danger">${username}</h5>
                </div>
                <div class="text-center">
                    <h4 class="text-danger">VS</h4>
                </div>
                <div class="match-player text-center">
                    <img src="${opponentAvatar}" class="rounded-circle border border-danger mb-3" width="80" height="80" alt="${opponent}">
                    <h5 class="mb-3 text-danger">${opponent}</h5>
                </div>
            </div>
            <div class="text-center mt-3">
                <span class="text-danger">${gameMode === "random" ? "Rakip Bulundu!" : "Turnuva Oyuncu Eşleşmesi"}</span>
            </div>
        `;

        if (gameMode === "random") {
            randomMatchElement.innerHTML = matchHTML;
            bsRandomMatchModal.show();
        } else {
            tournamentMatchElement.innerHTML = matchHTML;
            bsTournamentModal.show();
        }
    }

    let countdown = 3;

    const countdownInterval = setInterval(() => {
        const countdownHTML = `
            <div class="text-center">
                <h6 class="text-danger">Oyun ${countdown} saniye içinde başlıyor...</h6>
            </div>
        `;
        if (gameMode === "random") {
            randomMatchElement.innerHTML = countdownHTML;
        } else {
            tournamentMatchElement.innerHTML = countdownHTML;
        }
        countdown--;

        if (countdown < 0) {
            clearInterval(countdownInterval);
            if (gameMode === "random") {
                bsRandomMatchModal.hide();
            } else {
                bsTournamentModal.hide();
            }
            router.navigate(`/pong?room=${roomId}&mode=${gameMode}`);
        }
    }, 1000);
}

export async function init() {

    document.querySelector('[data-bs-target="#tournamentModal"]').addEventListener('click', () => {
        gameMode = 'tournament';
        initializeTournament();
    });

    document.querySelector('[data-bs-target="#randomMatchModal"]').addEventListener('click', async () => {
        gameMode = 'random';
        await initializeRandomMatch();
    });

    notificationSocket.addEventListener('message', async (event) => {
        const data = JSON.parse(event.data);
        const username = await getUserName();

        switch (data.type) {
            case 'tournament_player_joined':
                tournamentPlayers = data.current_players;
                updateTournamentPlayersUI();
                updateTournamentStatus(`${tournamentPlayers.length}/4 Oyuncu (${4 - tournamentPlayers.length} oyuncu bekleniyor)`);
                break;

            case 'tournament_player_left':
                tournamentPlayers = data.current_players;
                updateTournamentPlayersUI();
                updateTournamentStatus(`${tournamentPlayers.length}/4 Oyuncu (${4 - tournamentPlayers.length} oyuncu bekleniyor)`);
                break;

            case 'tournament_ready':
                tournamentPlayers = data.players;
                updateTournamentStatus('Eşleşmeler Belirleniyor...');
                updateTournamentPlayersUI();
                showTournamentPairings(data.pairings);

                const userPairing = data.pairings.find(pair => pair.includes(username));
                if (userPairing) {
                    const opponent = userPairing.find(player => player !== username);
                    const roomId = `tournament_${userPairing[0]}_${userPairing[1]}`;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    startCountdown(roomId , opponent);
                }
                break;

            case 'random_match_ready':
                if (gameMode === 'random') {
                    const opponent = data.players.find(player => player.username !== username);
                    if (opponent) {
                        startCountdown(data.roomId, opponent.username);
                    }
                }
                break;

        }
    });
}

function updateTournamentPlayersUI() {
    const tournamentPlayersElement = document.getElementById('tournamentPlayers');

    if (tournamentPlayers.length === 0) {
        tournamentPlayersElement.innerHTML = `
            <div class="text-center text-danger">
                <p>Henüz turnuvaya katılan oyuncu yok</p>
            </div>
        `;
        return;
    }

    tournamentPlayersElement.innerHTML = tournamentPlayers.map(player => `
        <div class="tournament-player">
            <img src="${player.avatar}" class="rounded-circle border border-danger mb-3" width="80" height="80" alt="${player.username}">
            <h5 class="mb-3 text-danger">${player.username}</h5>
        </div>
    `).join('');
}

function updateTournamentStatus(message, isLoading = true) {
    const tournamentStatus = document.getElementById('tournamentStatus');
    tournamentStatus.innerHTML = `
        <span class="text-danger">${message}</span>
    `;
}

function showTournamentPairings(pairings) {
    const tournamentStatus = document.getElementById('tournamentStatus');
    tournamentStatus.innerHTML = `
        <div class="text-danger">
            <h6>Yarı Final Eşleşmeleri:</h6>
            <div class="mt-2">
                ${pairings.map((pair, index) => `
                    <div class="mb-2">
                        Maç ${index + 1}: ${pair[0]} vs ${pair[1]}
                    </div>
                `).join('')}
            </div>
            <div class="mt-3">Maçlar birazdan başlayacak...</div>
        </div>
    `;
}
