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
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
`;

const fragmentShader = `
    uniform sampler2D uTexture;
    uniform float uAlpha;
    uniform vec2 uOffset;
    varying vec2 vUv;
    
    vec3 rgbShift(sampler2D textureImage, vec2 uv, vec2 offset) {
        float r = texture2D(textureImage, uv + offset).r;
        vec2 gb = texture2D(textureImage, uv).gb;
        return vec3(r, gb);
    }
    
    void main() {
        vec3 color = rgbShift(uTexture, vUv, uOffset);
        gl_FragColor = vec4(color, uAlpha);
    }
`;

const scrollable = document.querySelector('.scrollable');
const content = document.querySelector('.content');
const sections = [...document.querySelectorAll('.section')];

// Clone sections for infinite scrolling
sections.forEach(section => {
    const clonedSection = section.cloneNode(true);
    clonedSection.classList.add('clone');
    content.appendChild(clonedSection);
});

let current = 0;
let target = 0;
let ease = 0.075;

function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

function init() {
    document.body.style.height = `${scrollable.getBoundingClientRect().height}px`;
}

function smoothScroll() {
    target = window.scrollY;
    current = lerp(current, target, ease);
    scrollable.style.transform = `translate3d(0, ${-current}px, 0)`;
}

function scroll() {
    target = window.scrollY;
    const contentHeight = content.offsetHeight;
    const halfHeight = contentHeight / 2;

    if (target <= 0) {
        target = halfHeight - 1;
        current = target;
        window.scrollTo(0, target);
    } else if (target >= halfHeight) {
        target = 1;
        current = target;
        window.scrollTo(0, target);
    }

    scrollable.style.transform = `translateY(-${target}px)`;
    smoothScroll();
    requestAnimationFrame(scroll);
}

class EffectCanvas {
    constructor() {
        this.container = document.querySelector('main');
        this.images = [...document.querySelectorAll('img')];
        this.meshItems = [];
        this.setupCamera();
        this.createMeshItems();
        this.render();
    }

    get viewport() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspectRatio = width / height;
        return { width, height, aspectRatio };
    }

    setupCamera() {
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        document.addEventListener('DOMContentLoaded', () => scroll());

        this.scene = new THREE.Scene();

        const perspective = 1000;
        const fov =
            (180 * (2 * Math.atan(window.innerHeight / 2 / perspective))) /
            Math.PI;
        this.camera = new THREE.PerspectiveCamera(
            fov,
            this.viewport.aspectRatio,
            1,
            1000
        );
        this.camera.position.set(0, 0, perspective);

        this.renderer = new THREE.WebGL1Renderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.viewport.width, this.viewport.height);
        this.renderer.setPixelRatio(window.devicePixelRatio || 1);
        this.container.appendChild(this.renderer.domElement);
    }

    onWindowResize() {
        init();
        this.camera.aspect = this.viewport.aspectRatio;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.viewport.width, this.viewport.height);

        // Recalculate mesh dimensions
        this.meshItems.forEach(meshItem => meshItem.updateScale());
    }

    createMeshItems() {
        this.images.forEach(image => {
            const meshItem = new MeshItem(image, this.scene);
            this.meshItems.push(meshItem);
        });
    }

    render() {
        smoothScroll();
        this.meshItems.forEach(meshItem => meshItem.render());
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.render.bind(this));
    }
}

class MeshItem {
    constructor(element, scene) {
        this.element = element;
        this.scene = scene;
        this.offset = new THREE.Vector2(0, 0);
        this.sizes = new THREE.Vector2(0, 0);
        this.createMesh();
    }

    getDimensions() {
        const { width, height, top, left } = this.element.getBoundingClientRect();
        const scaleFactor = Math.min(1, window.innerWidth / 768); // Scale for mobile
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Adjust sizes based on viewport and scale factor
        this.sizes.set(width * scaleFactor, height * scaleFactor);

        // Calculate offsets to center the images
        this.offset.set(
            left + width / 2 - viewportWidth / 2,
            -top - height / 2 + viewportHeight / 2
        );
    }

    createMesh() {
        this.geometry = new THREE.PlaneGeometry(1, 1, 100, 100);
        this.imageTexture = new THREE.TextureLoader().load(this.element.src);
        this.uniforms = {
            uTexture: { value: this.imageTexture },
            uOffset: { value: new THREE.Vector2(0.0, 0.0) },
            uAlpha: { value: 1.0 },
        };
        this.material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader,
            fragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.getDimensions();
        this.mesh.position.set(this.offset.x, this.offset.y, 0);
        this.mesh.scale.set(this.sizes.x, this.sizes.y, 1);
        this.scene.add(this.mesh);
    }

    updateScale() {
        this.getDimensions();
        this.mesh.scale.set(this.sizes.x, this.sizes.y, 1);
    }

    render() {
        this.getDimensions();
        this.mesh.position.set(this.offset.x, this.offset.y, 0);
        this.uniforms.uOffset.value.set(
            this.offset.x * 0.0,
            -(target - current) * 0.0003
        );
    }
}

init();
new EffectCanvas();

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        document.body.classList.add("loaded");
    }, 1000);
});