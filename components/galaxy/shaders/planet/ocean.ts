/**
 * Ocean Planet Shader (Kamino)
 * Features:
 * - Animated wave displacement (simulated in fragment)
 * - Deep water / shallow water variation
 * - High specular reflection
 */

export const oceanFrag = `
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
    vec3 viewDir = normalize(-vPosition);
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    
    // Base ocean color
    vec3 deepWater = vec3(0.02, 0.05, 0.2);
    vec3 shallowWater = vec3(0.0, 0.4, 0.6);
    
    // Wave pattern
    float n = noise(vUv * 50.0 + uTime * 0.5);
    n += 0.5 * noise(vUv * 100.0 - uTime * 0.8);
    
    vec3 waterColor = mix(deepWater, shallowWater, n);
    
    // Lighting
    float diff = max(dot(vNormal, lightDir), 0.0);
    vec3 finalColor = waterColor * (diff * 0.5 + 0.5);
    
    // Specular (Sun reflection on water)
    vec3 reflectDir = reflect(-lightDir, vNormal + 0.1 * n);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 128.0);
    finalColor += vec3(0.8, 0.9, 1.0) * spec * 0.8;
    
    // Foam / crests
    float foam = smoothstep(0.7, 0.8, n);
    finalColor += vec3(1.0) * foam * 0.3;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const oceanVert = `
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
