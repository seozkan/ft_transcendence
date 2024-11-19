import { getUserName } from '../../code.js';

export async function init(params) {
    const username = await getUserName();
    const roomId = 'test';
    let playerSide = null;

    const gameSocket = new WebSocket(
        'wss://'
        + window.location.host
        + '/ws/game/'
        + roomId
        + '/'
        + username
        + '/'
    );

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const loader = new THREE.TextureLoader();
    const loaderFont = new THREE.FontLoader();

    renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.8);

    function checkOrientation() {
        let orientationWarning = document.getElementById('orientation-warning');
        if (window.innerWidth < window.innerHeight) {
            if (!orientationWarning) {
                orientationWarning = document.createElement('div');
                orientationWarning.id = 'orientation-warning';
                orientationWarning.className = 'position-fixed top-50 start-50 translate-middle bg-dark text-white text-center p-3 rounded border border-danger w-75';
                orientationWarning.style.zIndex = '1000';
                orientationWarning.textContent = 'Oyuna başlamak için lütfen cihazınızı yatay konuma getirin.';
                document.body.appendChild(orientationWarning);
            }
            renderer.domElement.style.display = 'none';
        } else {
            if (orientationWarning) {
                document.body.removeChild(orientationWarning);
            }
            renderer.domElement.style.display = 'block';
        }
    }

    checkOrientation();

    window.addEventListener("resize", () => {
        checkOrientation();
    });

    document.querySelector('.game-container').appendChild(renderer.domElement);

    const topLight = new THREE.SpotLight(0xffffff, 4);
    topLight.position.set(0, 100, 0);
    topLight.castShadow = true;
    scene.add(topLight);

    const bottomLight = new THREE.SpotLight(0xffffff, 1);
    bottomLight.position.set(0, -100, 0);
    bottomLight.castShadow = true;
    scene.add(bottomLight);

    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.1;

    camera.position.set(0, 8, 65);
    camera.lookAt(0, 0, 0);

    window.addEventListener('resize', () => {
        onWindowResize(camera, renderer);
    });

    function onWindowResize(camera, renderer) {
        const aspect = window.innerWidth / window.innerHeight;
        if (window.innerWidth < 768) {
            renderer.setSize(window.innerWidth * 0.7, window.innerHeight * 0.7);
        } else {
            renderer.setSize(window.innerWidth * 0.87, window.innerHeight * 0.87);
        }
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
    }

    let isMouseDown = false;
    let previousMousePosition = { x: 0, y: 0 };
    let isDragging = false;
    let isRotating = false;

    renderer.domElement.addEventListener('mousedown', (event) => {
        isMouseDown = true;
        previousMousePosition = { x: event.clientX, y: event.clientY };
        
        if (event.button === 0) {
            isDragging = true;
        }
        else if (event.button === 2) {
            isRotating = true;
        }
    });

    renderer.domElement.addEventListener('mouseup', () => {
        isMouseDown = false;
        isDragging = false;
        isRotating = false;
    });

    renderer.domElement.addEventListener('mousemove', (event) => {
        if (!isMouseDown) return;

        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;
        const moveSpeed = 0.1;
        const rotateSpeed = 0.01;

        if (isDragging) {
            camera.position.x -= deltaX * moveSpeed;
            camera.position.y -= deltaY * moveSpeed;
        }
        else if (isRotating) {
            camera.position.x = camera.position.x * Math.cos(deltaX * rotateSpeed) + camera.position.z * Math.sin(deltaX * rotateSpeed);
            camera.position.z = -camera.position.x * Math.sin(deltaX * rotateSpeed) + camera.position.z * Math.cos(deltaX * rotateSpeed);
            
            const radius = Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z);
            camera.position.y -= deltaY * moveSpeed;
            
            camera.position.y = Math.max(Math.min(camera.position.y, 50), -50);
        }

        camera.lookAt(scene.position);
        previousMousePosition = { x: event.clientX, y: event.clientY };
    });

    renderer.domElement.addEventListener('mouseleave', () => {
        isMouseDown = false;
        isDragging = false;
        isRotating = false;
    });

    renderer.domElement.addEventListener('wheel', (event) => {
        const zoomSpeed = 0.1;
        camera.position.z += event.deltaY * zoomSpeed;
        
        camera.position.z = Math.max(Math.min(camera.position.z, 100), 10);
        
        camera.lookAt(scene.position);
        event.preventDefault();
    });

    renderer.domElement.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });


    loader.load('https://www.manytextures.com/thumbnail/43/512/smooth+sand+dunes.jpg', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);

        const backgroundGeometry = new THREE.BoxGeometry(100, 50, 100);
        const materials = [
            new THREE.MeshStandardMaterial({ map: texture, side: THREE.BackSide }),
            new THREE.MeshStandardMaterial({ map: texture, side: THREE.BackSide }),
            new THREE.MeshStandardMaterial({ map: texture, side: THREE.BackSide }),
            new THREE.MeshStandardMaterial({ map: texture, side: THREE.BackSide }),
            new THREE.MeshStandardMaterial({ map: texture, side: THREE.BackSide }),
            new THREE.MeshStandardMaterial({ map: texture, side: THREE.BackSide })
        ];

        loader.load('https://www.manytextures.com/thumbnail/44/512/clear+sea+water.jpg', (bottomTexture) => {
            bottomTexture.wrapS = THREE.RepeatWrapping;
            bottomTexture.wrapT = THREE.RepeatWrapping;
            bottomTexture.repeat.set(4, 4);

            materials[3] = new THREE.MeshStandardMaterial({ map: bottomTexture, side: THREE.BackSide, metalness: 0.6, roughness: 0.3 });

            const backgroundBox = new THREE.Mesh(backgroundGeometry, materials);
            scene.add(backgroundBox);
        });
    });

    function addWall(positionX) {
        const wallGeometry = new THREE.BoxGeometry(20, 20, 1);
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(positionX, 0, -50);
        scene.add(wall);
    }

    function addWallText(text, positionX) {
        loaderFont.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
            const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

            const wallTextGeometry = new THREE.TextGeometry(text, {
                font: font,
                size: 2,
                height: 0.1,
            });
            const wallText = new THREE.Mesh(wallTextGeometry, textMaterial);
            wallTextGeometry.computeBoundingBox();
            const textWidth = wallTextGeometry.boundingBox.max.x - wallTextGeometry.boundingBox.min.x;
            wallText.position.set(positionX - textWidth / 2, 0, -49.5);
            scene.add(wallText);
        });
    }

    addWall(15);
    addWall(-15);


    var paddleWidth = 1;
    const paddleHeight = 0.5
    const paddleDepth = 4;
    const ballRadius = 0.5;

    const leftPaddleGeometry = new THREE.BoxGeometry(paddleWidth, paddleHeight, paddleDepth);
    const leftPaddleMaterial = new THREE.MeshStandardMaterial({ color: 0x0FBBC8, metalness: 0.3, roughness: 0.2 });
    const leftPaddle = new THREE.Mesh(leftPaddleGeometry, leftPaddleMaterial);
    leftPaddle.position.set(-19.5, -22.5, 0);
    scene.add(leftPaddle);

    const rightPaddleGeometry = new THREE.BoxGeometry(paddleWidth, paddleHeight, paddleDepth);
    const rightPaddleMaterial = new THREE.MeshStandardMaterial({ color: 0x770FC8, metalness: 0.3, roughness: 0.2 });
    const rightPaddle = new THREE.Mesh(rightPaddleGeometry, rightPaddleMaterial);
    rightPaddle.position.set(19.5, -22.5, 0);
    scene.add(rightPaddle);

    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xcccc00, roughness: 0.2 });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0, -22.2, 0);
    scene.add(ball);

    const tableGeometry = new THREE.BoxGeometry(40, 0.5, 20);
    const tableMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.5,
        metalness: 0.4,
        envMapIntensity: 0.5
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(0, -23, 0);
    scene.add(table);


    gameSocket.onopen = () => {
        console.log('webSocket connection established.');
    };

    gameSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch(data.type) {
            case 'player_assignment':
                playerSide = data.side;
                // addWallText(data.username, playerSide === 'left' ? -15 : 15);
                console.log(`You are playing on the ${playerSide} side as ${data.username}`);
                break;

            case 'player_disconnected':
                alert("Opponent has left the game! Game is ending...");
                break;

            case 'ball_update':
                ball.position.x = data.position.x;
                ball.position.z = data.position.z;
                break;

            case 'paddle_update':
                if (data.username !== username) {
                    if (playerSide === 'left') {
                        rightPaddle.position.z = data.position.z;
                    } else {
                        leftPaddle.position.z = data.position.z;
                    }
                }
                break;

            case 'score_update':
                console.log(`Score: Left Player - ${data.scores["left"]}, Right Player - ${data.scores["right"]}`);
                break;

            case 'game_start':
                console.log(`Game starting in ${data.countdown} seconds`);
                break;

            case 'opponent_joined':
                //addWallText(data.opponent_username, playerSide === 'left' ? 15 : -15);
                console.log(`Opponent joined: ${data.opponent_username}`);
                break;
        }
    };

    gameSocket.onclose = () => {
        console.log('WebSocket connection closed.');
    };

    gameSocket.onerror = function(error) {2 
        alert("Connection failed! This username is already in use");
    };

    function sendPaddleUpdate(position) {
        if (gameSocket.readyState === WebSocket.OPEN) {
            gameSocket.send(JSON.stringify({
                type: 'paddle_update',
                username: username,
                playerSide: playerSide,
                position: position
            }));
        }
    }

    let keys = {};
    document.addEventListener("keydown", (event) => { keys[event.key] = true; });
    document.addEventListener("keyup", (event) => { keys[event.key] = false; });

    function key_control() {
        if (!playerSide || gameSocket.readyState !== WebSocket.OPEN) return;

        if (playerSide === 'left') {
            if (((keys["s"] || keys["S"]) && leftPaddle.position.z + paddleDepth / 2 < 10)) {
                leftPaddle.position.z += 0.1;
                sendPaddleUpdate(leftPaddle.position);
            }
            if (((keys["w"] || keys["W"]) && leftPaddle.position.z - paddleDepth / 2 > -10)) {
                leftPaddle.position.z -= 0.1;
                sendPaddleUpdate(leftPaddle.position);
            }
        } else if (playerSide === 'right') {
            if (((keys["s"] || keys["S"]) && rightPaddle.position.z + paddleDepth / 2 < 10)) {
                rightPaddle.position.z += 0.1;
                sendPaddleUpdate(rightPaddle.position);
            }
            if (((keys["w"] || keys["W"]) && rightPaddle.position.z - paddleDepth / 2 > -10)) {
                rightPaddle.position.z -= 0.1;
                sendPaddleUpdate(rightPaddle.position);
            }
        }
    }

    const animate = () => {
        requestAnimationFrame(animate);
        key_control();
        renderer.render(scene, camera);
    };

    animate();
}

