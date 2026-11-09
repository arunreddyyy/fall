var canvas = document.getElementById("void");
var ctx = canvas.getContext("2d");

var density = 1.5;
var maxFlakes = 1500;
var gravity = 0.012;
var lifeScale = 1;
var trail = 0.28;
var pushRadius = 70;
var maxPile = 40;
var melt = 0.003;
var colW = 4;

var W, H;
var flakes = [];
var pile = [];
var lastX = null;
var lastY = null;
var lastTime = 0;

var greys = [255, 235, 210, 180, 150];

function resize() {
    var dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    pile = [];
    for (var i = 0; i <= W /colW; i++) pile.push(0);
}

function rand(a, b) {
    return a + Math.random() * (b - a);
}

function addFlake(x, y, moveX) {
    var size = 0.6 + Math.pow(Math.random(), 3) * 3;
    var big = size > 2.2;

    flakes.push({
        x: x + rand(-8, 8),
        y: y + rand(-8, 8),
        vx: moveX * 0.05 + rand(-0.8, 0.8),
        vy: rand(-0.4, 0.4),
        g: gravity * (0.6 + size * 0.25),
        phase: rand(0, 6.28),
        sway: rand(0.004, 0.02),
        size: size,
        squash: rand(0.6, 1),
        tilt: rand(0, 3.14),
        grey: greys[Math.floor(Math.random() * greys.length)],
        alpha: rand(0.4, 1) * (big ? 0.55 : 1),
        glow: big,
        life: rand(160, 380) * lifeScale,
        age: 0
    });
}

function pushFlakes(x, y ,moveX, moveY) {
    var speed = Math.hypot(moveX, moveY);
    var radius = pushRadius + Math.min(speed, 60) * 2;

    for (var i = 0; i<flakes.length; i++) {
        var f = flakes[i];
        var dx = f.x - x ;
        var dy = f.y - y;
        var d = Math.hypot(dx,dy);
        if (d == 0 || d > radius) continue;

        var power = 1 - d / radius;
        f.vx += dx / d * power * 0.6 + moveX * 0.02 * power;
        f.vy += dy / d * power * 0.3 + moveY * 0.015 * power;
    }
}

function onMove(x, y) {
    if(lastX === null){
        lastX = x;
        lastY = y;
        return;
    }

    var moveX = x - lastX;
    var moveY = y - lastY;
    var dist = Math.hypot(moveX, moveY);

    pushFlakes(x, y, moveX, moveY);

    var n = Math.min(Math.round(dist / 10 * density), 14);
    for (var i = 1; i <= n ; i++){
        addFlake(lastX + moveX * i / n, lastY + moveY * i / n, moveX);
    }


    if (n == 0 && dist > 1 && Math.random() < 0.4) {
        addFlake(x,y,moveX);
    }

    lastX = x;
    lastY = y;
}

function addToPile(col, amount) {
    if (col < 0 || col >= pile.length) return;
    pile[col] = Math.min(pile[col] + amount, maxPile);
}

function updatePile() {
    for (var i = 0; i <pile.length - 1; i++) {
        var diff = pile[i] - pile[i + 1];
        if (Math.abs(diff) > 1.5) {
            pile[i] -= diff * 0.1;
            pile[i + 1] += diff * 0.1;
        }
    }
    for (var j =0; j < pile.length; j++){
        pile[j] = Math.max(0,pile[j] - melt);
    }
}

function drawPile() {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var i =0; i< pile.length; i++) {
        ctx.lineTo(i * colW, H - pile[i]);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = "rgba(235,235,235,0.45)";
    ctx.fill();
}

function drawFlake(f) {
    var t = f.age / f.life;
    var a = f.alpha * Math.min(t * 10, 1) * (1 - t) * (1 - t);
    if (a < 0.01) return;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(" + f.grey + "," + f.grey + "," + f.grey + ")";
    if(f.glow) {
        ctx.shadowColor = "rgba(255,255,255,0.8)";
        ctx.shadowBlur = f.size * 4;
    }
    ctx.beginPath();
    ctx.ellipse(f.x,f.y,f.size, f.size * f. squash, f.tilt, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function loop(now) {
    var dt = Math.min((now - lastTime) / 16.67, 3);
    lastTime = now;

    ctx.globalAlpha = trail;
    ctx.fillStyle = "#000";
    ctx.fillRect(0,0,W,H);
    ctx.globalAlpha = 1;

    updatePile();
    drawPile();

    for(var i = flakes.length - 1; i >= 0; i--){
        var f = flakes[i];

        f.age += dt;
        f.vy += f.g * dt;
        f.vx += Math.sin(f.age * 0.04 + f.phase) * f.sway * dt;
        f.vx *= 0.97;
        f.vy *= 0.985;
        f.x += f.vx * dt;
        f.y += f.vy * dt;

        var col = Math.floor(f.x / colW);
        var landed = col >= 0 && col < pile.length && f.y >= H - pile[col];

        if (landed) {
            var amount = f.size * 0.25;
            addToPile(col, amount);
            addToPile(col - 1, amount / 2);
            addToPile(col + 1, amount / 2);
        }

        if (landed || f.age > f.life || f.y > H + 30) {
            flakes.splice(i, 1);
            continue;
        }
        drawFlake(f);
    }

    if (flakes.length > maxFlakes) {
        flakes.splice(0, flakes.length - maxFlakes);
    }

    requestAnimationFrame(loop);
}

window.addEventListener("mousemove", function (e) {
    onMove(e.clientX, e.clientY);
});
window.addEventListener("touchstart", function (e) {
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener("touchmove", function (e) {
    onMove(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

function forgetPointer() {
    lastX = null;
    lastY = null;
}

window.addEventListener("touchend", forgetPointer);
document.addEventListener("mouseleave", forgetPointer );

window.addEventListener("resize", resize);

resize();
requestAnimationFrame(loop);