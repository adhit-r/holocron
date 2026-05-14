/**
 * Gas Giant Shader (Bespin)
 * Features:
 * - Latitudinal banding
 * - Turbulent swirl patterns
 * - Soft atmospheric feel
 */

export const gasGiantFrag = `
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
    // Banding based on Y position
    float y = vPosition.y * 5.0 + 10.0;
    float band = noise(vec2(y, uTime * 0.01));
    
    // Swirls
    float swirl = noise(vUv * 10.0 + vec2(uTime * 0.05, band));
    swirl += 0.5 * noise(vUv * 20.0 - vec2(band, uTime * 0.02));
    
    // Color palettes (orange/beige for Bespin)
    vec3 color1 = vec3(0.9, 0.7, 0.4);
    vec3 color2 = vec3(0.6, 0.4, 0.2);
    vec3 color3 = vec3(0.95, 0.9, 0.8);
    
    vec3 finalColor = mix(color1, color2, band);
    finalColor = mix(finalColor, color3, swirl * 0.5);
    
    // Lighting (soft)
    vec3 light = normalize(vec3(0.5, 0.5, 1.0));
    float diff = max(dot(vNormal, light), 0.0);
    finalColor *= (diff * 0.6 + 0.4);
    
    // Fresnel for atmosphere
    float fresnel = pow(1.0 - max(dot(vNormal, normalize(-vPosition)), 0.0), 2.0);
    finalColor = mix(finalColor, vec3(1.0, 0.9, 0.8), fresnel * 0.3);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const gasGiantVert = `
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
