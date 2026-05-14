/**
 * Lava Planet Shader (Mustafar)
 * Features:
 * - Glowing magma fissures via Voronoi noise
 * - Moving convection cells
 * - Dark ashy rock surface
 */

export const lavaFrag = `
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

// Hash and Noise
vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
}

float voronoi(vec2 x) {
    vec2 n = floor(x);
    vec3 m = vec3(8.0);
    for(int j=-1; j<=1; j++)
    for(int i=-1; i<=1; i++) {
        vec2 g = vec2(float(i),float(j));
        vec2 o = hash2(n + g);
        o = 0.5 + 0.5*sin(uTime * 0.5 + 6.2831*o);
        vec2 r = g - fract(x) + o;
        float d = dot(r,r);
        if(d<m.x) m = vec3(d, o);
    }
    return m.x;
}

void main() {
    vec2 uv = vUv * 6.0;
    float v = voronoi(uv);
    
    // Fissures from voronoi distance
    float fissure = 1.0 - smoothstep(0.0, 0.1, v);
    
    // Lava color (orange/red glow)
    vec3 lavaColor = vec3(1.0, 0.3, 0.0) * (0.8 + 0.4 * sin(uTime + v * 10.0));
    lavaColor += vec3(1.0, 0.1, 0.0) * fissure * 5.0;
    
    // Rock color (dark ashy)
    vec3 rockColor = vec3(0.1, 0.08, 0.08);
    float rockNoise = voronoi(uv * 2.0 + 10.0);
    rockColor += 0.05 * rockNoise;
    
    vec3 finalColor = mix(rockColor, lavaColor, smoothstep(0.1, 0.5, fissure + 0.2 * voronoi(uv * 0.5)));
    
    // Lighting
    vec3 light = normalize(vec3(0.5, 1.0, 0.5));
    float diff = max(dot(vNormal, light), 0.0);
    finalColor *= (diff * 0.5 + 0.5);
    
    // Emissive glow for fissures
    finalColor += lavaColor * fissure * 0.5;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const lavaVert = `
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
