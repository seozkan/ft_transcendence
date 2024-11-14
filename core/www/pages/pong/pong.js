import { getUserInfo} from '../../code.js';

export async function init(params) {

    const username = params.get('username');
    const user = await getUserInfo(username);

    var playerOne = document.querySelector('#player1-label');
    playerOne.innerHTML = user.username;

    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const closeBtn = document.querySelector('.close');
    const paddleLengthSlider = document.getElementById('paddle-length');
    const paddleLengthDisplay = document.getElementById('paddle-length-display');
 
    settingsBtn.onclick = function () {
        modal.style.display = 'flex';
    }

    closeBtn.onclick = function () {
        modal.style.display = 'none';
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    paddleLengthSlider.oninput = function () {
        paddleLengthDisplay.textContent = `Uzunluk: ${this.value}`;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth * 0.7, window.innerHeight * 0.7);
    document.querySelector('.game-container').appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(10, 15, 10).normalize();
    light.castShadow = true;
    scene.add(light);

    const ambient = new THREE.AmbientLight(0x888888);
    scene.add(ambient);

    const spotLight = new THREE.SpotLight(0xFFFFFF, 3);
    spotLight.position.set(10, 10, 40);
    spotLight.castShadow = true;
    scene.add(spotLight);

    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.1;

    camera.position.set(0, 12, 15);
    camera.lookAt(0, 0, 0);

    window.addEventListener('resize', () => {
        onWindowResize(camera, renderer);
    });

    function onWindowResize(camera, renderer) {
        const aspect = window.innerWidth / window.innerHeight;
        renderer.setSize(window.innerWidth * 0.7, window.innerHeight * 0.7);
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
    }

    const loader = new THREE.TextureLoader();
    loader.load('https://www.manytextures.com/thumbnail/43/512/smooth+sand+dunes.jpg', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        const backgroundGeometry = new THREE.PlaneGeometry(250, 250);
        const backgroundMaterial = new THREE.MeshBasicMaterial({ map: texture });
        const backgroundPlane = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        backgroundPlane.position.set(0, 0, -50);
        scene.add(backgroundPlane);
    });

    loader.load('https://www.manytextures.com/thumbnail/44/512/clear+sea+water.jpg', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(6, 6);
        const floorGeometry = new THREE.PlaneGeometry(250, 250);
        const floorMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5, metalness: 0.3 });
        const floorPlane = new THREE.Mesh(floorGeometry, floorMaterial);
        floorPlane.rotation.x = -Math.PI / 2;
        floorPlane.position.set(0, -5, 0);
        scene.add(floorPlane);
    });

    var paddleWidth = 1;
    const paddleHeight = 0.5, paddleDepth = 3;
    const ballRadius = 0.4;

    const leftPaddleGeometry = new THREE.BoxGeometry(paddleWidth, paddleHeight, paddleDepth);
    const leftPaddleMaterial = new THREE.MeshStandardMaterial({ color: 0x0FBBC8, metalness: 0.6, roughness: 0.4 });
    const leftPaddle = new THREE.Mesh(leftPaddleGeometry, leftPaddleMaterial);
    leftPaddle.position.set(-9, 0.1, 0);
    scene.add(leftPaddle);

    const rightPaddleGeometry = new THREE.BoxGeometry(paddleWidth, paddleHeight, paddleDepth);
    const rightPaddleMaterial = new THREE.MeshStandardMaterial({ color: 0x770FC8, metalness: 0.6, roughness: 0.4 });
    const rightPaddle = new THREE.Mesh(rightPaddleGeometry, rightPaddleMaterial);
    rightPaddle.position.set(9, 0.1, 0);
    scene.add(rightPaddle);

    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xcccc00, roughness: 0.4 });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0, 0.25, 0);
    scene.add(ball);

    const tableGeometry = new THREE.BoxGeometry(20, 0.1, 10);
    const tableMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.5,
        metalness: 0.2,
        envMapIntensity: 0.5
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(0, -0.05, 0);
    scene.add(table);

    document.getElementById('save-settings').onclick = function () {
        const tableColor = document.getElementById('table-color').value;
        const paddleColor = document.getElementById('paddle-color').value;
        const paddleLength = document.getElementById('paddle-length').value;

        leftPaddle.scale.z = paddleLength;
        rightPaddle.scale.z = paddleLength;
        
        paddleWidth = paddleLength;
        
        tableMaterial.color.set(tableColor);
        leftPaddleMaterial.color.set(paddleColor);
        rightPaddleMaterial.color.set(paddleColor);
        modal.style.display = 'none';
    };
    
    let keys = {};
    document.addEventListener("keydown", (event) => { keys[event.key] = true; });
    document.addEventListener("keyup", (event) => { keys[event.key] = false; });
    
    const boundaryX = 10;
    const boundaryZ = 4;

    function handlePaddleCollision() {
        const paddleOverlap = paddleWidth / 2;

        if (!collisionCooldown &&
            ((ball.position.x >= rightPaddle.position.x - paddleOverlap &&
                ball.position.x <= rightPaddle.position.x + paddleOverlap &&
                ball.position.z <= rightPaddle.position.z + rightPaddle.scale.z * paddleDepth / 2 &&
                ball.position.z >= rightPaddle.position.z - rightPaddle.scale.z * paddleDepth / 2) ||
                (ball.position.x <= leftPaddle.position.x + paddleOverlap &&
                    ball.position.x >= leftPaddle.position.x - paddleOverlap &&
                    ball.position.z <= leftPaddle.position.z + leftPaddle.scale.z * paddleDepth / 2 &&
                    ball.position.z >= leftPaddle.position.z - leftPaddle.scale.z * paddleDepth / 2)
            )) {
            ballVelocity.x *= -1;
            collisionCooldown = true;
            setTimeout(() => { collisionCooldown = false; }, cooldownDuration);
        }
    }
    
    function animator() {
        requestAnimationFrame(animator);

        if ((keys["s"] && leftPaddle.position.z < boundaryZ - 0.75) || (keys["S"] && leftPaddle.position.z < boundaryZ - 0.75)) {
            leftPaddle.position.z += 0.075;
        }
        if ((keys["w"] && leftPaddle.position.z > -boundaryZ + 0.75) || (keys["W"] && leftPaddle.position.z > -boundaryZ + 0.75)) {
            leftPaddle.position.z -= 0.075;
        }
        if (keys["ArrowDown"] && rightPaddle.position.z < boundaryZ - 0.75 && !aiEnabled) {
            rightPaddle.position.z += 0.075;
        }
        if (keys["ArrowUp"] && rightPaddle.position.z > -boundaryZ + 0.75 && !aiEnabled) {
            rightPaddle.position.z -= 0.075;
        }

        camera.lookAt(scene.position);
        renderer.render(scene, camera);
    }

    animator();

    let ballVelocity = new THREE.Vector3(0.1, 0, 0.1);
    let collisionCooldown = false;
    const cooldownDuration = 500;


    let player1Score = 0;
    let player2Score = 0;
    const winningScore = 5;
    let gamePaused = false;

    function updateScore() {
        document.getElementById("player1-score").textContent = player1Score;
        document.getElementById("player2-score").textContent = player2Score;

        if (player1Score === winningScore || player2Score === winningScore) {
            document.getElementById("winner-label").textContent = player1Score === winningScore ? "Player 1 wins!" : aiEnabled ? "AI wins!" : "Player 2 wins!";
            pauseGame();
        }
    }

    function pauseGame() {
        gamePaused = true;
        setTimeout(() => {
            gamePaused = false;
            resetGame();
        }, 3000);
    }

    function resetGame() {
        player1Score = 0;
        player2Score = 0;
        updateScore();
        document.getElementById("winner-label").textContent = "";
        ballReset();
    }

    function ballReset() {
        ball.position.set(0, 0.25, 0);
        ballVelocity.set(
            (Math.random() > 0.5 ? 1 : -1) * 0.1,
            0,
            (Math.random() > 0.5 ? 1 : -1) * 0.1
        );
        updateScore();
    }

    let aiEnabled = false;
    let animationFrameId = null;
    var singlebtn = document.getElementById('singleplayer-btn');

    function startGameWithCountdown(callback) {
        const counterDisplay = document.getElementById("counter-display");
        const counterSetup = document.getElementById("counter-setup");

        let countdown = 3;
        counterSetup.style.display = "block";
        counterDisplay.textContent = countdown;

        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                counterSetup.style.display = "none";
                callback();
                singlebtn.disabled = false;
            } else {
                counterDisplay.textContent = countdown;
            }
        }, 1000);
    }

    document.getElementById('singleplayer-btn').addEventListener('click', function() {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        rightPaddle.position.set(9, 0.1, 0);
        aiEnabled = false;
        resetGame();
        singlebtn.disabled = true;
        startGameWithCountdown(() => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
            }

            aiEnabled = true;
            document.getElementById('player2-label').textContent = 'AI';
            resetGame();

            let targetZ = ball.position.z;
            setInterval(() => {
                targetZ = ball.position.z;
            }, 100);

            function aiControl() {
                if (aiEnabled) {
                    const aiSpeed = 0.075;
                    const adjustedTargetZ = targetZ;
                    rightPaddle.position.z = THREE.MathUtils.lerp(
                        rightPaddle.position.z,
                        adjustedTargetZ,
                        aiSpeed
                    );
                    rightPaddle.position.z = THREE.MathUtils.clamp(rightPaddle.position.z, -boundaryZ + 0.75, boundaryZ - 0.75);
                }
            }

            function animate() {
                animationFrameId = requestAnimationFrame(animate);

                if (!gamePaused) {
                    ball.position.add(ballVelocity);
                    aiControl();

                    if (ball.position.x > boundaryX) {
                        player1Score++;
                        ballReset();
                    } else if (ball.position.x < -boundaryX) {
                        player2Score++;
                        ballReset();
                    }

                    if (ball.position.z > boundaryZ || ball.position.z < -boundaryZ) {
                        ballVelocity.z *= -1;
                    }

                    handlePaddleCollision();
                }
                renderer.render(scene, camera);
            }

            animate();
        });
    });

    document.getElementById('tournament-btn').addEventListener('click', function() {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        aiEnabled = false;
        document.getElementById('player2-label').textContent = 'Player 2';
        rightPaddle.position.set(9, 0.1, 0);
        resetGame();
    });
}

window.onload = init;