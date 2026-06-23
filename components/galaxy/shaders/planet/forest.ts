/**
 * Forest Planet Shader (Endor / Kashyyyk)
 * Features:
 * - Green canopy noise
 * - Occasional water patches
 * - Atmospheric scattering (blue/green haze)
 */

export const forestFrag = `
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}

void main() {
    // Base forest green
    vec3 forestColor = vec3(0.1, 0.3, 0.1);
    vec3 highlightColor = vec3(0.2, 0.5, 0.2);
    vec3 waterColor = vec3(0.05, 0.1, 0.3);
    
    // Canopy noise
    float canopy = noise(vUv * 30.0);
    canopy += 0.5 * noise(vUv * 60.0);
    
    // Water bodies
    float water = smoothstep(0.7, 0.8, noise(vUv * 5.0));
    
    vec3 surfaceColor = mix(forestColor, highlightColor, canopy);
    surfaceColor = mix(surfaceColor, waterColor, water);
    
    // Lighting
    vec3 light = normalize(vec3(0.5, 1.0, 0.5));
    float diff = max(dot(vNormal, light), 0.0);
    vec3 finalColor = surfaceColor * (diff * 0.8 + 0.2);
    
    // Atmospheric scattering
    float fresnel = pow(1.0 - max(dot(vNormal, normalize(-vPosition)), 0.0), 3.0);
    vec3 haze = vec3(0.6, 0.8, 0.7);
    finalColor = mix(finalColor, haze, fresnel * 0.4);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const forestVert = `
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
