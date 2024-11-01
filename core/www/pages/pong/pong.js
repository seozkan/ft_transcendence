export function init(params) {
    // Temel sahne ayarları
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth * 0.7, window.innerHeight * 0.7); // Oyun alanının boyutu
    document.querySelector('.game-container').appendChild(renderer.domElement);

    // Işık ekle
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.castShadow = true;
    light.position.set(5, 5, 5).normalize();
    const ambient = new THREE.AmbientLight(0xFFFFFF, 2);
    const spot = new THREE.SpotLight(0xffa95c, 10);
    spot.castShadow = true;
    spot.shadow.bias = -0.0001;
    spot.shadow.mapSize.width = 1024 * 4;
    spot.shadow.mapSize.height = 1024 * 4;
    scene.add(spot);
    spot.position.set(camera.position.x + 10, camera.position.y + 10, camera.position.z + 10)
    renderer.toneMapping = THREE.ReinhardTonemapping;
    renderer.toneMappingExposure = 1.2;
    scene.add(ambient);
    scene.add(light);

    // Texture Loader'ı başlat
    const loader = new THREE.TextureLoader();

    // Arka plan duvarı için görseli yükle
    loader.load('https://images.pexels.com/photos/220182/pexels-photo-220182.jpeg', function (texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4); // Tekrarlama sayısını ayarlayın (4x4 örneği)
        const backgroundGeometry = new THREE.PlaneGeometry(100, 100); // Tüm ekranı kaplayacak büyük bir düzlem
        const backgroundMaterial = new THREE.MeshBasicMaterial({ map: texture });
        const backgroundPlane = new THREE.Mesh(backgroundGeometry, backgroundMaterial);

        // Arka planı kameraya dik olacak şekilde yerleştirin
        backgroundPlane.position.set(0, 0, -5); // Kameraya yakın konum
        scene.add(backgroundPlane);
    });

    // Zemin için görseli yükle
    loader.load('https://images.pexels.com/photos/11285511/pexels-photo-11285511.png', function (texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4); // Tekrarlama sayısını ayarlayın (4x4 örneği)
        const floorGeometry = new THREE.PlaneGeometry(100, 100); // Zemin için düzlem boyutu
        const floorMaterial = new THREE.MeshBasicMaterial({ map: texture });
        const floorPlane = new THREE.Mesh(floorGeometry, floorMaterial);

        // Zemin düzlemini yatay hale getir ve aşağı yerleştir
        floorPlane.rotation.x = -Math.PI / 2;
        floorPlane.position.set(0, -5, 0); // Zemini sahneye yerleştir
        scene.add(floorPlane);
    });




    // Pedal ve top özellikleri
    const paddleWidth = 0.5, paddleHeight = 0.2, paddleDepth = 2;
    const ballRadius = 0.3;

    // Sol pedal
    const leftPaddleGeometry = new THREE.BoxGeometry(paddleWidth, paddleHeight, paddleDepth);
    const leftPaddleMaterial = new THREE.MeshStandardMaterial({ color: 0x0FBBC8 });
    const leftPaddle = new THREE.Mesh(leftPaddleGeometry, leftPaddleMaterial);
    leftPaddle.position.set(-5, 0.1, 0);
    scene.add(leftPaddle);

    // Sağ pedal
    const rightPaddleGeometry = new THREE.BoxGeometry(paddleWidth, paddleHeight, paddleDepth);
    const rightPaddleMaterial = new THREE.MeshStandardMaterial({ color: 0x770FC8 });
    const rightPaddle = new THREE.Mesh(rightPaddleGeometry, rightPaddleMaterial);
    rightPaddle.position.set(5, 0.1, 0);
    scene.add(rightPaddle);

    // Top
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0, 0.25, 0);
    scene.add(ball);

    // Masa
    const tableGeometry = new THREE.BoxGeometry(12, 0.1, 6); // Genişlik, yükseklik, derinlik
    const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x541609 });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(0, -0.05, 0); // Masayı biraz aşağı kaydır
    scene.add(table);

    // Kamera ayarları
    camera.position.set(0, 8, 10); // Kamerayı sahnenin ortasına yerleştir
    camera.lookAt(0, 0, 0); // Kamerayı ortadaki noktaya odakla
    let cameraAngle = 0;

    // Hedef pozisyonlar tanımla
    let leftPaddleTargetY = leftPaddle.position.z;
    let rightPaddleTargetY = rightPaddle.position.z;
    let cameraTargetY = camera.position.y;

    // Klavye kontrol durumu
    const keys = {};

    // Klavye kontrolleri
    document.addEventListener("keydown", (event) => {
        keys[event.key] = true; // Tuş basılı
    });

    document.addEventListener("keyup", (event) => {
        keys[event.key] = false; // Tuş bırakıldı
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "o") {
            cameraTargetY += 0.7;
        }
        if (event.key === "l") {
            cameraTargetY -= 0.7;
        }
    });

    // Oyun alanı sınırları
    const boundaryX = 6;
    const boundaryZ = 2.8; // Masanın yarısı kadar
    const camBoundary = 6;

    // Topu sıfırlama fonksiyonu
    function ballReset() {
        ball.position.set(0, 0.25, 0); // Orta noktaya taşı
        ballVelocity.set(
            (Math.random() > 0.5 ? 1 : -1) * 0.1, // Rastgele yön
            0,
            (Math.random() > 0.5 ? 1 : -1) * 0.1
        );
    }

    // Her animasyon karesinde hedefe doğru yumuşak geçiş yap
    function animator() {
        requestAnimationFrame(animator);

        // Klavye durumunu kontrol et ve pedal hedeflerini güncelle
        if (keys["s"] && leftPaddle.position.z < boundaryZ - 1) {
            leftPaddle.position.z += 0.2; // Yukarı hareket
        }
        if (keys["w"] && leftPaddle.position.z > -boundaryZ) {
            leftPaddle.position.z -= 0.2; // Aşağı hareket
        }
        if (keys["ArrowDown"] && rightPaddle.position.z < boundaryZ - 1) {
            rightPaddle.position.z += 0.2; // Yukarı hareket
        }
        if (keys["ArrowUp"] && rightPaddle.position.z > -boundaryZ) {
            rightPaddle.position.z -= 0.2; // Aşağı hareket
        }

        camera.position.y += (cameraTargetY - camera.position.y) * 0.2;
        camera.position.y = THREE.MathUtils.clamp(camera.position.y, -0, 16);

        // Pedalların hareket sınırlarını ayarlama
        leftPaddle.position.z = THREE.MathUtils.clamp(leftPaddle.position.z, -boundaryZ + 1, boundaryZ - 1);
        rightPaddle.position.z = THREE.MathUtils.clamp(rightPaddle.position.z, -boundaryZ + 1, boundaryZ - 1);

        // Kamera döndürme ve sahne güncellemesi
        cameraAngle += 0.01;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
    }

    animator();

    // Top hareket hızı
    let ballVelocity = new THREE.Vector3(0.1, 0, 0.1);

    // Animasyon döngüsü
    function animate() {
        requestAnimationFrame(animate);

        // Top hareketi
        ball.position.add(ballVelocity);

        // Duvar çarpması
        if (ball.position.x > boundaryX || ball.position.x < -boundaryX) {
            ballReset(); // Sınıra ulaşıldığında topu sıfırlıyoruz
        }
        if (ball.position.z > boundaryZ || ball.position.z < -boundaryZ) {
            ballVelocity.z *= -1; // Üst ve alt sınır için top yön değiştirir
        }

        // Pedal çarpması
        if ((ball.position.x > rightPaddle.position.x - paddleWidth / 2 && ball.position.x < rightPaddle.position.x + paddleWidth / 2 &&
            ball.position.z < rightPaddle.position.z + paddleDepth / 2 && ball.position.z > rightPaddle.position.z - paddleDepth / 2) ||
            (ball.position.x < leftPaddle.position.x + paddleWidth / 2 && ball.position.x > leftPaddle.position.x - paddleWidth / 2 &&
                ball.position.z < leftPaddle.position.z + paddleDepth / 2 && ball.position.z > leftPaddle.position.z - paddleDepth / 2)) {
            ballVelocity.x *= -1; // Pedalların çarptığı noktada x yönünü ters çevir
        }

        // Kamera döndürme
        cameraAngle += 0.01;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    }
    animate();

    // Pencere yeniden boyutlandırma
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth * 0.7, window.innerHeight * 0.7); // Oyun alanının boyutu
        camera.aspect = (window.innerWidth * 0.7) / (window.innerHeight * 0.7);
        camera.updateProjectionMatrix();
    });
}