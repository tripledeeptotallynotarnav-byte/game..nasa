import * as THREE from 'three';

export interface MarsAtmosphereUniforms extends Record<string, THREE.IUniform> {
  uTime: { value: number };
  uNight: { value: number };
  uStorm: { value: number };
  uSunGlow: { value: number };
}

export function createMarsAtmosphere(): {
  geometry: THREE.SphereGeometry;
  material: THREE.ShaderMaterial;
  uniforms: MarsAtmosphereUniforms;
} {
  const geometry = new THREE.SphereGeometry(100, 40, 24);
  const uniforms: MarsAtmosphereUniforms = {
    uTime: { value: 0 },
    uNight: { value: 0 },
    uStorm: { value: 0 },
    uSunGlow: { value: 0.9 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uNight;
      uniform float uStorm;
      uniform float uSunGlow;
      varying vec3 vDirection;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      float cloudField(vec2 p) {
        float n = 0.0;
        float amplitude = 0.52;
        for (int i = 0; i < 4; i++) {
          n += noise(p) * amplitude;
          p = p * 2.03 + vec2(13.7, 8.2);
          amplitude *= 0.5;
        }
        return n;
      }

      void main() {
        vec3 direction = normalize(vDirection);
        float height = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 dayZenith = vec3(0.19, 0.31, 0.49);
        vec3 dayHorizon = vec3(0.86, 0.39, 0.22);
        vec3 nightZenith = vec3(0.012, 0.025, 0.075);
        vec3 nightHorizon = vec3(0.16, 0.095, 0.19);
        vec3 daySky = mix(dayHorizon, dayZenith, smoothstep(0.12, 0.86, height));
        vec3 nightSky = mix(nightHorizon, nightZenith, smoothstep(0.12, 0.88, height));
        vec3 sky = mix(daySky, nightSky, uNight);

        vec2 cloudUv = direction.xz / max(0.2, abs(direction.y) + 0.22);
        cloudUv = cloudUv * vec2(3.2, 2.25) + vec2(uTime * 0.006, uTime * 0.002);
        float clouds = cloudField(cloudUv);
        float cloudMask = smoothstep(0.53 - uStorm * 0.11, 0.72, clouds);
        float horizonFade = smoothstep(-0.06, 0.3, direction.y);
        float cloudOpacity = cloudMask * horizonFade * (0.16 + uStorm * 0.31) * (1.0 - uNight * 0.75);
        vec3 cloudColor = mix(vec3(0.98, 0.68, 0.48), vec3(0.61, 0.38, 0.35), uStorm * 0.7);
        sky = mix(sky, cloudColor, cloudOpacity);

        float sun = pow(max(dot(direction, normalize(vec3(-0.48, 0.72, 0.31))), 0.0), 30.0);
        float halo = pow(max(dot(direction, normalize(vec3(-0.48, 0.72, 0.31))), 0.0), 5.5);
        sky += vec3(1.0, 0.56, 0.29) * (sun * 0.24 + halo * 0.055) * uSunGlow * (1.0 - uNight);
        gl_FragColor = vec4(sky, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  return { geometry, material, uniforms };
}
