import * as THREE from 'three';

const vertexShader = `
    uniform sampler2D uTexture;
    uniform vec2 uOffset;
    varying vec2 vUv;

    #define M_PI 3.1415926535897932384626433832795

    vec3 deformationCurve(vec3 position, vec2 uv, vec2 offset) {
        position.x = position.x + (sin(uv.y * M_PI) * offset.x);
        position.y = position.y + (sin(uv.x * M_PI) * offset.y);
        return position;
    }

    void main() {
        vUv = uv;
        vec3 newPosition = deformationCurve(position, uv, uOffset);
        gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
    }
`

const fragmentShader = `
    uniform sampler2D uTexture;
    uniform float uAlpha;
    uniform vec2 uOffset;
    varying vec2 vUv;
    
    vec3 rgbShift(sampler2D textureImage, vec2 uv, vec2 offset) {
        float r = texture2D(textureImage,uv + offset).r;
        vec2 gb = texture2D(textureImage,uv).gb;
        return vec3(r,gb);
    }
    
    void main() {
        vec3 color = rgbShift(uTexture,vUv,uOffset);
        gl_FragColor = vec4(color,uAlpha);
    }
`

let paragraphs = [...document.querySelectorAll('.hero-container p')];
let spans = [];

paragraphs.forEach(paragraph => {
    let htmlString = '';
    let pArray = paragraph.textContent.split('');
    for (let i = 0; i < pArray.length; i++){
        htmlString += `<span>${pArray[i]}</span>`;
    }
    paragraph.innerHTML = htmlString;
})

spans = [...document.querySelectorAll('.hero-container span')];

function revealSpans() {
    for (let i = 0; i < spans.length; i++) {
        let { left, top } = spans[i].getBoundingClientRect();
        top = top - (window.innerHeight * 0.35);
        const calc = ((top * 0.1) + (left * 0.001))
        let opacityValue = 1 - calc < 0.1 ? 0.1 : 1 - calc.toFixed(3);
        opacityValue = opacityValue > 1 ? 1 : opacityValue.toFixed(3);
        spans[i].style.opacity = opacityValue
    }
}

const projects = [];

let scrollable = document.querySelector('.scrollable');

const wraps = [...document.querySelectorAll('.wrap')];
const menuTog = document.querySelector('.menu-tog');
const menu = document.querySelector('.menu');
const menuWraps = [...document.querySelectorAll('.menu-wrap')];

let current = 0;
let target = 0;
let ease = 0.075;

// Linear inetepolation used for smooth scrolling and image offset uniform adjustment

function lerp(start, end, t){
    return start * (1 - t ) + end * t;
}

// init function triggered on page load to set the body height to enable scrolling and EffectCanvas initialised
function init(){
    document.body.style.height = `${scrollable.getBoundingClientRect().height}px`;
}

function displayWraps(){
    wraps.forEach((wrap, idx) => {
        setTimeout(() => {
            wrap.classList.add('active');
        }, (idx + 1) * 50)
    })
}

function toggleMenu(){
    if(menu.classList.contains('active')){
        menuTog.classList.remove('active');
        toggleMenuWraps(false);
        setTimeout(() => {
            menu.classList.remove('active')
        }, 300)
        setTimeout(() => {
            toggleWraps(true);
        }, 300)
    }else{
        menuTog.classList.add('active');
        toggleWraps(false);
        setTimeout(() => {
            menu.classList.add('active')
        }, 300)
        setTimeout(() => {
            toggleMenuWraps(true);
        }, 300)
    }
}

function toggleWraps(active){
    wraps.forEach(wrap => {
        toggleWrap(wrap, active);
    })
}

function toggleMenuWraps(active){
    menuWraps.forEach(wrap => {
        toggleWrap(wrap, active);
    })
}

function toggleWrap(wrap, active){
    setTimeout(() => {
        if(active){
            wrap.classList.add('active');
        }else{
            wrap.classList.remove('active');
        }
    })
}

target = 1;

// translate the scrollable div using the lerp function for the smooth scrolling effect.
function smoothScroll(){
    target = window.scrollY;
    current = lerp(current, target, ease);
    scrollable.style.transform = `translate3d(0,${-current}px, 0)`;
}

class EffectCanvas{
    constructor(){
        this.container = document.querySelector('main');
        this.images = [...document.querySelectorAll('img')];
        this.meshItems = []; // Used to store all meshes we will be creating.
        this.setupCamera();
        this.createMeshItems();
        this.render()
    }

    // Getter function used to get screen dimensions used for the camera and mesh materials
    get viewport(){
        let width = window.innerWidth;
        let height = window.innerHeight;
        let aspectRatio = width / height;
        return {
          width,
          height,
          aspectRatio
        };
    }

    setupCamera(){
        revealSpans()
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        menuTog.addEventListener('click', toggleMenu)
        window.addEventListener('scroll', () => revealSpans())
    
        // Create new scene
        this.scene = new THREE.Scene();
    
        // Initialize perspective camera
    
        let perspective = 1000;
        const fov = (180 * (2 * Math.atan(window.innerHeight / 2 / perspective))) / Math.PI; // see fov image for a picture breakdown of this fov setting.
        this.camera = new THREE.PerspectiveCamera(fov, this.viewport.aspectRatio, 1, 1000)
        this.camera.position.set(0, 0, perspective); // set the camera position on the z axis.
        
        // renderer
        // this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer = new THREE.WebGL1Renderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.viewport.width, this.viewport.height); // uses the getter viewport function above to set size of canvas / renderer
        this.renderer.setPixelRatio(window.devicePixelRatio); // Import to ensure image textures do not appear blurred.
        this.container.appendChild(this.renderer.domElement); // append the canvas to the main element
    }

    onWindowResize(){
        init();
        this.camera.aspect = this.viewport.aspectRatio; // readjust the aspect ratio.
        this.camera.updateProjectionMatrix(); // Used to recalulate projectin dimensions.
        this.renderer.setSize(this.viewport.width, this.viewport.height); 
    }

    createMeshItems(){
        // Loop thorugh all images and create new MeshItem instances. Push these instances to the meshItems array.
        this.images.forEach(image => {
            let meshItem = new MeshItem(image, this.scene);
            this.meshItems.push(meshItem);
        })
    }

    // Animate smoothscroll and meshes. Repeatedly called using requestanimationdrame
    render(){
        smoothScroll();
        for(let i = 0; i < this.meshItems.length; i++){
            this.meshItems[i].render();
        }
        this.renderer.render(this.scene, this.camera)
        requestAnimationFrame(this.render.bind(this));
    } 
}

class MeshItem{
    // Pass in the scene as we will be adding meshes to this scene.
    constructor(element, scene){
        this.element = element;
        this.scene = scene;
        this.offset = new THREE.Vector2(0,0); // Positions of mesh on screen. Will be updated below.
        this.sizes = new THREE.Vector2(0,0); //Size of mesh on screen. Will be updated below.
        this.createMesh();
    }

    getDimensions(){
        const {width, height, top, left} = this.element.getBoundingClientRect();
        this.sizes.set(width, height);
        this.offset.set(left - window.innerWidth / 2 + width / 2, -top + window.innerHeight / 2 - height / 2); 
    }

    createMesh(){
        this.geometry = new THREE.PlaneGeometry(1,1,100,100);
        this.imageTexture = new THREE.TextureLoader().load(this.element.src);
        this.uniforms = {
            uTexture: {
                //texture data
                value: this.imageTexture
              },
              uOffset: {
                //distortion strength
                value: new THREE.Vector2(0.0, 0.0)
              },
              uAlpha: {
                //opacity
                value: 1.
              }
        };
        this.material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            // wireframe: true,
            side: THREE.DoubleSide
        })
        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.getDimensions(); // set offsetand sizes for placement on the scene
        this.mesh.position.set(this.offset.x, this.offset.y, 0);
		this.mesh.scale.set(this.sizes.x, this.sizes.y, 1);

        this.scene.add( this.mesh );
    }

    render(){
        // this function is repeatidly called for each instance in the aboce 
        this.getDimensions();
        this.mesh.position.set(this.offset.x, this.offset.y, 0)
		this.mesh.scale.set(this.sizes.x, this.sizes.y, 1)
        this.uniforms.uOffset.value.set(this.offset.x * 0.0, -(target- current) * 0.0003 )
    }
}
displayWraps()
init()
new EffectCanvas()
