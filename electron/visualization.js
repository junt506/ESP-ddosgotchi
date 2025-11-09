/**
 * Neural Nexus - DDoS Gotchi 3D Visualization
 * Harmonic Sphere visualization with green color scheme
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export class NeuralNexusVisualization {
    constructor(containerElement) {
        this.container = containerElement;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.dataNodes = null;
        this.trailSystem = null;
        this.backgroundNodes = null;
        this.time = 0;
        this.isAttackMode = false;

        // Configuration - locked to Harmonic Sphere, green, all effects on
        this.nodeCount = 28000;
        this.trailCount = 10000;
        this.baseColor = '#00ff00'; // Green
        this.colorScheme = this.generateColorScheme(this.baseColor);

        this.initialize();
    }

    generateColorScheme(baseHex) {
        const base = new THREE.Color(baseHex);
        const hsl = base.getHSL({h:0, s:0, l:0});
        const scheme = [];
        for (let i = 0; i < 10; i++) {
            const h = (hsl.h + (i - 5) * 0.03) % 1;
            const s = Math.min(1, Math.max(0, hsl.s + (i - 5) * 0.02));
            const l = Math.min(1, Math.max(0, hsl.l + (i - 5) * 0.03));
            const c = new THREE.Color().setHSL(h, s, l);
            scheme.push(c);
        }
        return scheme;
    }

    generateHarmonicSphere(i, count) {
        const t = i / count;
        const phi = Math.acos(1 - 2 * t);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const radius = 80;
        const perturbation = 0.2 * (Math.sin(5 * phi) * Math.cos(3 * theta) + Math.cos(4 * phi) * Math.sin(2 * theta));
        const r = radius * (1 + perturbation);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        return new THREE.Vector3(x, y, z);
    }

    initialize() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000814, 0.0005);

        // Camera setup
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 2500);
        this.camera.position.set(0, 0, 155);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        // Post-processing
        this.setupPostProcessing();

        // Create visualization elements
        this.createBackgroundParticles();
        this.createDataVisualization();
        this.createTrailSystem();

        // Start animation loop
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
            0.5,
            0.6,
            0.8
        );
        this.composer.addPass(bloomPass);

        const distortionShader = {
            uniforms: {
                tDiffuse: { value: null },
                time: { value: 0.0 },
                intensity: { value: 0.02 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float time;
                uniform float intensity;
                varying vec2 vUv;
                void main() {
                    vec2 uv = vUv;
                    uv.x += sin(uv.y * 10.0 + time) * intensity;
                    uv.y += cos(uv.x * 10.0 + time) * intensity;
                    gl_FragColor = texture2D(tDiffuse, uv);
                }
            `
        };
        this.distortionPass = new ShaderPass(distortionShader);
        this.composer.addPass(this.distortionPass);
        this.composer.addPass(new OutputPass());
    }

    createBackgroundParticles() {
        const bgGeometry = new THREE.BufferGeometry();
        const bgCount = 3000;
        const bgPositions = new Float32Array(bgCount * 3);
        const bgColors = new Float32Array(bgCount * 3);

        for (let i = 0; i < bgCount; i++) {
            const radius = 250 + Math.random() * 350;
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;

            bgPositions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
            bgPositions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
            bgPositions[i * 3 + 2] = radius * Math.cos(theta);

            const intensity = Math.random() * 0.4 + 0.2;
            bgColors[i * 3] = intensity * 0.2;
            bgColors[i * 3 + 1] = intensity * 0.6;
            bgColors[i * 3 + 2] = intensity * 0.2;
        }

        bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
        bgGeometry.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));

        const bgMaterial = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.backgroundNodes = new THREE.Points(bgGeometry, bgMaterial);
        this.scene.add(this.backgroundNodes);
    }

    createDataVisualization() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.nodeCount * 3);
        const colors = new Float32Array(this.nodeCount * 3);
        const sizes = new Float32Array(this.nodeCount);

        for (let i = 0; i < this.nodeCount; i++) {
            const pos = this.generateHarmonicSphere(i, this.nodeCount);
            positions[i * 3] = pos.x;
            positions[i * 3 + 1] = pos.y;
            positions[i * 3 + 2] = pos.z;

            this.assignParticleProperties(i, colors, sizes);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                textureMap: { value: this.createEnhancedParticleTexture() },
                glowIntensity: { value: 1.0 }
            },
            vertexShader: `
                attribute vec3 color;
                attribute float size;
                varying vec3 vColor;
                uniform float time;
                uniform float glowIntensity;
                void main() {
                    vColor = color * (1.0 + 0.2 * sin(time * 2.0 + position.y * 0.05)) * glowIntensity;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (350.0 / -mvPosition.z) * (1.0 + 0.1 * sin(time + position.x));
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D textureMap;
                uniform float time;
                varying vec3 vColor;
                void main() {
                    vec2 uv = gl_PointCoord - vec2(0.5);
                    float r = length(uv) * 2.0;
                    vec4 tex = texture2D(textureMap, gl_PointCoord);
                    float alpha = tex.a * (1.0 - smoothstep(0.8, 1.0, r));
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.dataNodes = new THREE.Points(geometry, material);
        this.scene.add(this.dataNodes);
    }

    assignParticleProperties(i, colors, sizes) {
        const channelIndex = Math.floor((i / this.nodeCount) * 12);
        const color = this.colorScheme[channelIndex % this.colorScheme.length];
        const brightness = 0.8 + Math.random() * 0.7;

        colors[i * 3] = color.r * brightness;
        colors[i * 3 + 1] = color.g * brightness;
        colors[i * 3 + 2] = color.b * brightness;

        sizes[i] = 1.0 + Math.random() * 2.5;
    }

    createEnhancedParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');

        const centerX = 128, centerY = 128;

        const outerGradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 128);
        outerGradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        outerGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
        outerGradient.addColorStop(0.6, 'rgba(200, 255, 255, 0.4)');
        outerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        context.fillStyle = outerGradient;
        context.fillRect(0, 0, 256, 256);

        const coreGradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 20);
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        coreGradient.addColorStop(1, 'rgba(200, 255, 255, 0.3)');

        context.fillStyle = coreGradient;
        context.beginPath();
        context.arc(centerX, centerY, 20, 0, Math.PI * 2);
        context.fill();

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    createTrailSystem() {
        const trailGeometry = new THREE.BufferGeometry();
        const trailPositions = new Float32Array(this.trailCount * 3);
        const trailColors = new Float32Array(this.trailCount * 3);
        const trailSizes = new Float32Array(this.trailCount);
        const trailOpacities = new Float32Array(this.trailCount);

        for (let i = 0; i < this.trailCount; i++) {
            trailPositions[i * 3] = (Math.random() - 0.5) * 120;
            trailPositions[i * 3 + 1] = (Math.random() - 0.5) * 120;
            trailPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;

            const color = this.colorScheme[Math.floor(Math.random() * this.colorScheme.length)];
            trailColors[i * 3] = color.r;
            trailColors[i * 3 + 1] = color.g;
            trailColors[i * 3 + 2] = color.b;

            trailSizes[i] = Math.random() * 2 + 0.8;
            trailOpacities[i] = Math.random() * 0.6 + 0.3;
        }

        trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
        trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));
        trailGeometry.setAttribute('opacity', new THREE.BufferAttribute(trailOpacities, 1));

        const trailMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                textureMap: { value: this.createTrailTexture() }
            },
            vertexShader: `
                attribute vec3 color;
                attribute float size;
                attribute float opacity;
                varying vec3 vColor;
                varying float vOpacity;
                uniform float time;
                void main() {
                    vColor = color;
                    vOpacity = opacity * (0.5 + 0.5 * sin(time + position.x * 0.1));
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D textureMap;
                varying vec3 vColor;
                varying float vOpacity;
                void main() {
                    vec4 tex = texture2D(textureMap, gl_PointCoord);
                    gl_FragColor = vec4(vColor * tex.rgb, tex.a * vOpacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.trailSystem = new THREE.Points(trailGeometry, trailMaterial);
        this.scene.add(this.trailSystem);
    }

    createTrailTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');

        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    setAttackMode(isAttack) {
        this.isAttackMode = isAttack;

        // Generate new color scheme based on mode
        const baseColor = isAttack ? '#ff0000' : '#00ff00';
        this.colorScheme = this.generateColorScheme(baseColor);

        // Reassign data node colors with variation
        if (this.dataNodes) {
            const colors = this.dataNodes.geometry.attributes.color.array;
            const sizes = this.dataNodes.geometry.attributes.size.array;

            for (let i = 0; i < this.nodeCount; i++) {
                this.assignParticleProperties(i, colors, sizes);
            }

            this.dataNodes.geometry.attributes.color.needsUpdate = true;
        }

        // Reassign trail colors with variation
        if (this.trailSystem) {
            const colors = this.trailSystem.geometry.attributes.color.array;

            for (let i = 0; i < this.trailCount; i++) {
                const channelIndex = Math.floor((i / this.trailCount) * 12);
                const color = this.colorScheme[channelIndex % this.colorScheme.length];
                const brightness = 0.6 + Math.random() * 0.4;

                colors[i * 3] = color.r * brightness;
                colors[i * 3 + 1] = color.g * brightness;
                colors[i * 3 + 2] = color.b * brightness;
            }

            this.trailSystem.geometry.attributes.color.needsUpdate = true;
        }
    }

    animateTrailSystem() {
        if (!this.trailSystem) return;

        const positions = this.trailSystem.geometry.attributes.position.array;
        const opacities = this.trailSystem.geometry.attributes.opacity.array;

        for (let i = 0; i < this.trailCount; i++) {
            const ix = i * 3, iy = ix + 1, iz = ix + 2;

            // Harmonic sphere trail animation
            const speed = this.isAttackMode ? 0.7 : 0.35;
            positions[iy] += speed;
            if (positions[iy] > 70) positions[iy] = -70;
            positions[ix] += Math.sin(this.time * 2.2 + i * 0.12) * 0.12;
            positions[iz] += Math.cos(this.time * 2.0 + i * 0.12) * 0.12;

            opacities[i] = 0.4 + Math.sin(this.time * 3.5 + i * 0.12) * 0.35;
        }

        this.trailSystem.geometry.attributes.position.needsUpdate = true;
        this.trailSystem.geometry.attributes.opacity.needsUpdate = true;
        this.trailSystem.material.uniforms.time.value = this.time;
    }

    animateDataFlow() {
        if (!this.dataNodes) return;

        const positions = this.dataNodes.geometry.attributes.position.array;
        const rotationSpeed = this.isAttackMode ? 0.04 : 0.005;  // 8x faster during attacks!

        // Rotate the harmonic sphere
        for (let i = 0; i < this.nodeCount; i++) {
            const ix = i * 3, iz = i * 3 + 2;
            const x = positions[ix];
            const z = positions[iz];
            positions[ix] = x * Math.cos(rotationSpeed) - z * Math.sin(rotationSpeed);
            positions[iz] = x * Math.sin(rotationSpeed) + z * Math.cos(rotationSpeed);
        }

        this.dataNodes.geometry.attributes.position.needsUpdate = true;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.time += this.isAttackMode ? 0.06 : 0.012;  // 5x faster during attacks!

        // Rotate background particles (faster during attacks)
        if (this.backgroundNodes) {
            const bgSpeed = this.isAttackMode ? 3 : 1;
            this.backgroundNodes.rotation.y += 0.0004 * bgSpeed;
            this.backgroundNodes.rotation.x += 0.00015 * bgSpeed;
        }

        // Animate sphere rotation
        this.animateDataFlow();

        // Animate trails
        this.animateTrailSystem();

        // Update uniforms
        if (this.dataNodes) {
            this.dataNodes.material.uniforms.time.value = this.time;
        }

        if (this.distortionPass) {
            this.distortionPass.uniforms.time.value = this.time;
        }

        // Render scene
        this.composer.render();
    }

    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }

    destroy() {
        window.removeEventListener('resize', () => this.onResize());
        this.renderer.dispose();
        this.composer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}
