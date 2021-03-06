var windowHalfX = 640/2;
var windowHalfY = 480/2;
var mouseX = 0;
var mouseY = 0;

var waveGrid = function (opt) {
    opt = opt || {};
    opt.width = opt.width || 30;
    opt.depth = opt.depth || 30;
    opt.height = opt.height || 2;
    opt.forPoint = opt.forPoint || function () {};
    opt.context = opt.context || opt;
    opt.xStep = opt.xStep || 0.075;
    opt.yStep = opt.yStep || 0.1;
    opt.zStep = opt.zStep || 0.075;
    opt.waveOffset = opt.waveOffset === undefined ? 0 : opt.waveOffset;
    var points = [],
    radPer,
    x = 0,
    i = 0,
    y,
    z;
    // points
    while (x < opt.width) {
        z = 0;
        while (z < opt.depth) {
            // radian percent
            radPer = (z / opt.depth + (1 / opt.width * x) + opt.waveOffset) % 1;
            // y value of point
            y = Math.cos(Math.PI * 4 * radPer) * opt.height;
            // call forPoint
            opt.forPoint.call(opt.context, x * opt.xStep, y * opt.yStep, z * opt.zStep, i);
            // step z, and point index
            z += 1;
            i += 3;
        }
        x += 1;
    };
};

// update points
var updatePoints = function (points, per) {
    var position = points.geometry.getAttribute('position');
    var boatpos = boat.position;
    // update points
    waveGrid({
        waveOffset: per,
        xStep: 0.125,
        zStep: 0.125,
        forPoint: function (x, y, z, i) {
            //add slope
            if( Math.round(x) == Math.round(boatpos.x)
                && Math.round(z) == Math.round(boatpos.z)){
                boat.position.y = .7 + y;
                /* boat.position.x = x;
                boat.position.z = z; */
            }
            
            position.array[i] = x - 2;
            position.array[i + 1] = y - 2;
            position.array[i + 2] = z - 2;
        }
    });
    position.needsUpdate = true;
}

var renderer = new THREE.WebGLRenderer({
    //antialias: true
});
renderer.setSize(640, 480);
document.getElementById('demo').appendChild(renderer.domElement);

window.addEventListener('mousemove', onDocumentMouseMove, false);
function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) / 10;
    mouseY = (event.clientY - windowHalfY) / 10;
}



var scene = new THREE.Scene();
var fogColor = new THREE.Color(0.0, 0.0, 0.0);
scene.background = fogColor;
scene.fog = new THREE.FogExp2(fogColor, 0.3);


// make a points mesh
var makePoints = function () {
    var geometry = new THREE.BufferGeometry();
    var points = [],
    opt = {};
    opt.forPoint = function (x, y, z, i) {
        points.push(x, y, z);
    };
    waveGrid(opt);
    var vertices = new Float32Array(points);
    // itemSize = 3 because there are 3 values (components) per vertex
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    return new THREE.Points(
        // geometry as first argument
        geometry,
        // then Material
        new THREE.PointsMaterial({
            size: .125,
            color: new THREE.Color(0.0, 0.25, 0.25)
        }));
};
var makeBoat = function (x,y,z) {
    var geometry = new THREE.BoxGeometry(0.2,0.2,0.2);
    var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    return new THREE.Mesh(geometry,material);
};


var makeMat = function(x,y,z){
    var geometry = new THREE.MeshBasicMaterial({color: 0x004488,wireframe: true});
    var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
}


var points = makePoints();
var boat = makeBoat();

document.addEventListener('keydown', (event) => {
    if(event.key == "i"){
        boat.position.z = boat.position.z + 0.1;
    }
    if(event.key == "k"){
        boat.position.z = boat.position.z - 0.1;
    }
    if(event.key == "j"){
        boat.position.x = boat.position.x - 0.1;
    }
    if(event.key == "l"){
        boat.position.x = boat.position.x + 0.1;
    }
  }, false);

//scene.add(mat);
scene.add(points);
scene.add(boat);

camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10);

// position of points an camera
//mat.position.set(0,2.5,0);
points.position.set(0, 2.5, 0);
boat.position.set(0, 2.5, 0);
camera.position.set(1, 2.5, 1.5);

var frame = 0;
maxFrame = 300;
lt = new Date();
fps = 20;
var d = 0.1;
function loop(){
    var now = new Date(),
    secs = (now - lt) / 1000,
    per = frame / maxFrame,
    bias = 1 - Math.abs(per - 0.5) / 0.5,
    mul = 3;
    requestAnimationFrame(loop);

    if (secs > 1 / fps) {
        updatePoints(points, per * mul % 1);
        //updateBoat();
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
        frame += fps * secs;
        frame %= maxFrame;
        lt = now;
    }
};

loop();


