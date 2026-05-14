/**
 * Desert Planet Shader
 * Features:
 * - Procedural sand dunes via noise
 * - Wind ripple effect
 * - Atmospheric haze
 * - Twin-sun specular highlights
 */

export const desertFrag = `
uniform float uTime;
uniform vec3 uColor;
uniform float uHaze;
uniform vec2 uResolution;
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

// Simple 3D noise for dunes
float hash(float n) { return fract(sin(n) * 43758.5453123); }
float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    float n = p.x + p.y*157.0 + 113.0*p.z;
    return mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                   mix( hash(n+157.0), hash(n+158.0),f.x),f.y),
               mix(mix( hash(n+113.0), hash(n+114.0),f.x),
                   mix( hash(n+270.0), hash(n+271.0),f.x),f.y),f.z);
}

void main() {
    // Base sand color
    vec3 sandColor = uColor;
    
    // Create large scale dune patterns
    float dunes = noise(vPosition * 2.0 + vec3(uTime * 0.05));
    sandColor *= 0.8 + 0.4 * dunes;
    
    // Add fine wind ripples
    float ripples = sin(vPosition.x * 40.0 + vPosition.z * 20.0 + noise(vPosition * 10.0) * 5.0);
    sandColor += 0.05 * ripples * dunes;
    
    // Lighting
    vec3 light1 = normalize(vec3(1.0, 1.0, 1.0));
    vec3 light2 = normalize(vec3(-0.8, 0.4, -0.5));
    
    float diff1 = max(dot(vNormal, light1), 0.0);
    float diff2 = max(dot(vNormal, light2), 0.0);
    
    vec3 finalColor = sandColor * (diff1 * 0.8 + diff2 * 0.4 + 0.2);
    
    // Twin sun speculars
    vec3 viewDir = normalize(-vPosition);
    vec3 reflect1 = reflect(-light1, vNormal);
    vec3 reflect2 = reflect(-light2, vNormal);
    float spec1 = pow(max(dot(viewDir, reflect1), 0.0), 32.0);
    float spec2 = pow(max(dot(viewDir, reflect2), 0.0), 32.0);
    
    finalColor += vec3(1.0, 0.9, 0.7) * spec1 * 0.3;
    finalColor += vec3(1.0, 0.7, 0.5) * spec2 * 0.2;
    
    // Atmospheric haze (fresnel based)
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
    vec3 hazeColor = vec3(0.9, 0.8, 0.6);
    finalColor = mix(finalColor, hazeColor, fresnel * uHaze);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const desertVert = `
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
