import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTheme } from "@/components/ThemeProvider";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  uniform float uHue;
  uniform float uLightness;
  varying vec2 vUv;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
    return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
  }

  vec3 getColorCircle(int index, float total) {
    float hue = uHue + float(index)/total;
    return hsl2rgb(vec3(mod(hue,1.0), 0.7, uLightness * 6.0));
  }

  vec3 getBackgroundColor(float hue) {
    return hsl2rgb(vec3(mod(hue,1.0), 0.6, uLightness));
  }

  float circleShape(vec2 pos, float radius) {
    return smoothstep(radius, radius-0.003, length(pos));
  }

  void main() {
    vec2 uv = vUv;
    float aspectRatio = uResolution.x / uResolution.y;
    vec2 uvAspect = vec2(uv.x * aspectRatio, uv.y);
    vec2 mouseOffset = (uMouse - 0.5) * 0.15;
    float hue = uHue;
    vec3 color = getBackgroundColor(hue);
    float numCircles = 5.0;
    float circleRadius = 0.4;
    float circleSpeed = 0.0004;
    float distortionAmount = 0.12;

    for(int i=0; i<5; i++) {
      float fi = float(i);
      float angle = fi * (6.28/numCircles) + uTime * circleSpeed * (fi+1.0);
      float radius = 0.15 + fi * 0.02;
      vec2 circlePos = vec2(cos(angle)*radius*aspectRatio, sin(angle)*radius) + mouseOffset * (fi+1.0);
      vec2 noiseUv = uv * 3.0 + fi * 100.0;
      float noise = snoise(vec3(noiseUv, uTime * 0.0002));
      float distortion = noise * distortionAmount;
      circlePos += distortion;
      vec3 circleColor = getColorCircle(i, numCircles);
      float circle = circleShape(uvAspect - circlePos, circleRadius);
      color = mix(color, circleColor, circle * 0.6);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

function ShaderMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { theme } = useTheme();
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const targetMouseRef = useRef(new THREE.Vector2(0.5, 0.5));

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uHue: { value: 0.72 },
      uLightness: { value: theme === "dark" ? 0.08 : 0.95 },
    }),
    [theme]
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const material = meshRef.current.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = state.clock.getElapsedTime() * 1000;
    material.uniforms.uLightness.value = THREE.MathUtils.lerp(
      material.uniforms.uLightness.value,
      theme === "dark" ? 0.08 : 0.95,
      0.05
    );

    mouseRef.current.lerp(targetMouseRef.current, 0.05);
    material.uniforms.uMouse.value.copy(mouseRef.current);
  });

  const handlePointerMove = (e: THREE.Event) => {
    const native = (e as any).nativeEvent;
    if (native) {
      targetMouseRef.current.set(
        native.clientX / window.innerWidth,
        1 - native.clientY / window.innerHeight
      );
    }
  };

  return (
    <mesh ref={meshRef} onPointerMove={handlePointerMove}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function ShaderBackground() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <Canvas
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: false, alpha: false }}
        camera={{ position: [0, 0, 1] }}
      >
        <ShaderMesh />
      </Canvas>
    </div>
  );
}
