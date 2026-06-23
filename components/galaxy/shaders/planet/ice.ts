/**
 * Ice Planet Shader (Hoth)
 * Features:
 * - Cracked frozen surface
 * - Suble aurora at the poles
 * - High albedo (bright blue/white)
 */

export const iceFrag = `
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

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
    vec3 viewDir = normalize(-vPosition);
    
    // Base ice color
    vec3 iceColor = vec3(0.8, 0.9, 1.0);
    
    // Cracks (using high frequency noise)
    float cracks = noise(vPosition * 15.0);
    cracks = pow(1.0 - abs(cracks - 0.5) * 2.0, 10.0);
    iceColor *= 1.0 - cracks * 0.2;
    
    // Large scale variation
    iceColor += 0.1 * noise(vPosition * 2.0);
    
    // Aurora at poles (Y axis)
    float poleMask = smoothstep(0.7, 1.0, abs(vNormal.y));
    vec3 auroraColor = vec3(0.2, 1.0, 0.5) * (0.5 + 0.5 * sin(uTime + vPosition.x * 2.0));
    iceColor = mix(iceColor, iceColor + auroraColor, poleMask * 0.5);
    
    // Lighting
    vec3 light = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(vNormal, light), 0.0);
    vec3 finalColor = iceColor * (diff * 0.7 + 0.3);
    
    // Fresnel for "icy" look
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0);
    finalColor += vec3(0.5, 0.8, 1.0) * fresnel * 0.4;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const iceVert = `
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
