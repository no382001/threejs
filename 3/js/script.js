"use strict";

var verShader = `
#define SCALE 50.0

varying vec2 vUv;

uniform float uTime;

float calculateSurface(float x, float z) {
    float y = 0.0;
    y += sin(x * 2.8 / SCALE + uTime * 1.5);
    y += sin(z * 2.45 / SCALE + uTime * 1.7);
    return y;
}

void main() {
    vUv = uv;
    vec3 pos = position;
    
    float strength = 0.5;
    pos.y += strength * calculateSurface(pos.x, pos.z);
    pos.y -= strength * calculateSurface(0.0, 0.5);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.1);

}  
`;

var fragShader = `
varying vec2 vUv;

uniform sampler2D uMap;
uniform float uTime;
uniform vec3 uColor;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;

void main() {

    vec2 uv = vUv * 50.0 + vec2(uTime * -0.05);

    uv.y += 0.01 * (sin(uv.x * 3.5 + uTime * 0.35) + sin(uv.x * 4.8 + uTime * 1.05) + sin(uv.x * 7.3 + uTime * 0.45)) / 3.0;
    uv.x += 0.12 * (sin(uv.y * 4.0 + uTime * 0.5) + sin(uv.y * 6.8 + uTime * 0.75) + sin(uv.y * 11.3 + uTime * 0.2)) / 3.0;
    uv.y += 0.12 * (sin(uv.x * 4.2 + uTime * 0.64) + sin(uv.x * 6.3 + uTime * 1.65) + sin(uv.x * 8.2 + uTime * 0.45)) / 3.0;

    vec4 tex1 = texture2D(uMap, uv * 1.0);
    vec4 tex2 = texture2D(uMap, uv * 1.5 + vec2(0.2));

    vec3 blue = uColor;

    gl_FragColor = vec4(blue + vec3(tex1.a * 0.4 - tex2.a * 0.02), 1.0);
    gl_FragColor.a = 0.8;

    #ifdef USE_FOG
          #ifdef USE_LOGDEPTHBUF_EXT
              float depth = gl_FragDepthEXT / gl_FragCoord.w;
          #else
              float depth = gl_FragCoord.z / gl_FragCoord.w;
          #endif
          float fogFactor = smoothstep( fogNear, fogFar, depth );
          gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
     #endif
}
`;


window.addEventListener('load', init, false);

var scene, camera, fieldOfView, aspectRatio, nearPlane, farPlane, HEIGHT, WIDTH,renderer, container, controls,loaderManager,loaded;


var clock = new THREE.Clock();


function createScene() {

	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	scene = new THREE.Scene();

	scene.fog = new THREE.Fog (0x4ca7e6, 400, 800); 

	aspectRatio = WIDTH / HEIGHT;
	fieldOfView = 60;
	nearPlane = 1;
	farPlane = 400;

	renderer = new THREE.WebGLRenderer({ 
		//alpha: true, 
		//antialias: true 
	});

	renderer.setSize(WIDTH, HEIGHT);
	renderer.shadowMap.enabled = true;	
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	container = document.getElementById('canvas');
	container.appendChild(renderer.domElement);
	window.addEventListener('resize', handleWindowResize, false);
}

function handleWindowResize() {
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	renderer.setSize(WIDTH, HEIGHT);
	camera.aspect = WIDTH / HEIGHT;
	camera.updateProjectionMatrix();
}

var hemisphereLight, shadowLight;

function createLights() {
	hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, 1)
	scene.add(hemisphereLight);  

	/* shadowLight = new THREE.DirectionalLight(0xbfe0f8, .8);

	shadowLight.position.set(-300,650,350);
	shadowLight.castShadow = true;
	shadowLight.shadow.camera.left = -700;
	shadowLight.shadow.camera.right = 700;
	shadowLight.shadow.camera.top = 500;
	shadowLight.shadow.camera.bottom = -500;
	shadowLight.shadow.camera.near = 1;
	shadowLight.shadow.camera.far = 1000;
	shadowLight.shadow.mapSize.width = 2056;
	shadowLight.shadow.mapSize.height = 2056;

	scene.add(shadowLight); */
}


var loaderManager = new THREE.LoadingManager();
loaderManager.onStart = function ( url, itemsLoaded, itemsTotal ) {
	console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
};
loaderManager.onLoad = function ( ) {
	console.log( 'Loading complete!');
	finishedLoading();
};
loaderManager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
	console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
};
loaderManager.onError = function ( url ) {
	console.log( 'There was an error loading ' + url );
};



var Sea = function() {
	
	this.mesh = new THREE.Object3D();

	var geomWaves = new THREE.PlaneBufferGeometry(500, 500, 500, 500);
	geomWaves.rotateX(-Math.PI / 2);

	this.uniforms = {
        uMap: {type: 't', value: null},
        uTime: {type: 'f', value: 0},
        uColor: {type: 'f', value: new THREE.Color('#307ddd')},
	    fogColor:    { type: "c", value: scene.fog.color },
	    fogNear:     { type: "f", value: scene.fog.near },
	    fogFar:      { type: "f", value: scene.fog.far }
    };

	var shader = new THREE.ShaderMaterial({

	    uniforms: this.uniforms,
	    vertexShader: verShader,
	    fragmentShader: fragShader,
	    side: THREE.FrontSide,
	    //fog: true,
	    //transparent:true,
	});

    var textureLoader = new THREE.TextureLoader(loaderManager);
    textureLoader.load('images/water-shader.png', function (texture) {
        shader.uniforms.uMap.value = texture;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    });
	
	this.mesh = new THREE.Mesh(geomWaves, shader);

	/* var geomSeaBed = new THREE.PlaneBufferGeometry(500, 500, 500, 500);
	geomSeaBed.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
	var matWaves = new THREE.MeshPhongMaterial( {
		color:0x307ddd,
		//shading:THREE.SmoothShading,
	});
	var seaBed = new THREE.Mesh(geomSeaBed, matWaves);
	seaBed.position.set(0,-10,0);
	seaBed.castShadow = false;
	seaBed.receiveShadow = true;
	this.mesh.add(seaBed); */
}

var Boat = function() {
	
	this.mesh = new THREE.Object3D();
	var cameraMesh = new THREE.Group();
	this.group = new THREE.Group();

	camera = new THREE.PerspectiveCamera(
		fieldOfView,
		aspectRatio,
		nearPlane,
		farPlane
		);

	controls = new THREE.OrbitControls(camera, renderer.domElement);
	camera.position.set(0,30,100);

	cameraMesh.add(camera);

	cameraMesh.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, -24) );

	cameraMesh.add(this.group);

	this.mesh.add(cameraMesh);

}

var sea, boat;

function createSea(){ 
	sea = new Sea();
	scene.add(sea.mesh);
	sea.mesh.castShadow = false;
	//sea.mesh.receiveShadow = true;
}

function createBoat(){ 
	boat = new Boat();
	boat.mesh.position.set(-100,0.25,100);
	boat.mesh.scale.set(1,1,1);
	scene.add(boat.mesh);
}


function finishedLoading(){
	loaded = true;
	document.getElementById('preloader').classList.add('hidden');
}

function init() {
	createScene();
	//createLights();
	createSea();
	createBoat();
	//initSkybox();	
	loop();	
}


function loop(e){
	sea.uniforms.uTime.value = e * 0.001;

	renderer.render(scene, camera);
	requestAnimationFrame(loop);
}
