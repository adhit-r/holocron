/**
 * City Planet Shader (Coruscant)
 * Features:
 * - Emissive grid lights on the night side
 * - Industrial metallic surface
 * - Moving lights (traffic)
 */

export const cityFrag = `
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float daySide = dot(vNormal, lightDir);
    
    // Day side: industrial grey/blue
    vec3 dayColor = vec3(0.4, 0.42, 0.45);
    
    // Night side: dark with lights
    vec3 nightColor = vec3(0.05, 0.06, 0.1);
    
    // Procedural grid lights
    vec2 grid = floor(vUv * 200.0);
    float lightRand = hash(grid);
    float cityLights = step(0.98, lightRand);
    
    // Traffic (moving lights)
    float traffic = step(0.995, hash(grid + floor(uTime * 10.0)));
    
    vec3 lights = vec3(1.0, 0.8, 0.4) * cityLights * 2.0;
    lights += vec3(0.4, 0.6, 1.0) * traffic * 3.0;
    
    // Blend day and night
    float dayNightMask = smoothstep(-0.2, 0.2, daySide);
    vec3 finalColor = mix(nightColor + lights, dayColor * (daySide * 0.8 + 0.2), dayNightMask);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const cityVert = `
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
