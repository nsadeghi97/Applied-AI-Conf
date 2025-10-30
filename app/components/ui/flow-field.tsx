"use client";

import { useEffect, useRef } from "react";

const vertexShader = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;
  
  // Hash function for random values
  float hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p.x + p.y) * 43758.5453123);
  }
  
  // Star field with hyperspace effect
  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    // Rotate around Z axis (spinning effect) - slower
    float rotationSpeed = u_time * 0.02;
    float cosRot = cos(rotationSpeed);
    float sinRot = sin(rotationSpeed);
    vec2 rotatedUV = vec2(
      uv.x * cosRot - uv.y * sinRot,
      uv.x * sinRot + uv.y * cosRot
    );
    uv = rotatedUV;
    
    // Radial distance
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);
    
    // Create tunnel effect - stars move outward towards camera
    float speed = u_time * 0.08;
    float depth = dist * 3.0 - speed;
    
    // Star field - individual stars flying towards camera
    float stars = 0.0;
    float trails = 0.0;
    
    // Create many individual stars
    for (float i = 0.0; i < 50.0; i += 1.0) {
      // Each star has its own position and depth
      float starId = i + floor(depth * 10.0);
      vec2 starScreenPos = vec2(
        hash(vec2(starId, 0.0)) * 2.0 - 1.0,
        hash(vec2(starId, 1.0)) * 2.0 - 1.0
      );
      
      // Star depth determines how close it is (closer = brighter, larger)
      float starDepth = fract(depth * 0.1 + i * 0.017);
      float starSize = 0.001 + starDepth * starDepth * 0.008;
      float starBrightness = 1.0 - starDepth;
      starBrightness = pow(starBrightness, 2.0);
      
      // Distance from current pixel to star
      vec2 starUV = uv - starScreenPos * (0.3 + starDepth * 0.7);
      float starDist = length(starUV);
      
      // Create star point
      float star = 1.0 / (1.0 + starDist / starSize);
      star *= starBrightness;
      stars += star;
      
      // Add motion trail effect (streak behind star) - brighter and longer
      float trailDist = abs(dot(normalize(starUV), normalize(starScreenPos)));
      float trail = smoothstep(starSize * 8.0, starSize, starDist) * smoothstep(1.0, 0.2, trailDist);
      trail *= starBrightness * 1.2;
      trails += trail;
    }
    
    // Very dark base - almost black
    vec3 color = vec3(0.0005, 0.001, 0.0015);
    
    // Add bright white-blue stars
    color += vec3(0.8, 0.9, 1.0) * stars * 0.6;
    
    // Add dark blue transparent trails
    color += vec3(0.1, 0.2, 0.4) * trails * 0.8;
    
    // Radial gradient fade from center
    float fade = smoothstep(1.5, 0.3, dist);
    color *= fade;
    
    gl_FragColor = vec4(color, 0.85);
  }
`;

interface FlowFieldProps {
  className?: string;
}

export function FlowField({ className }: FlowFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const createProgram = (vertex: string, fragment: string) => {
      const vertShader = createShader(gl.VERTEX_SHADER, vertex);
      const fragShader = createShader(gl.FRAGMENT_SHADER, fragment);
      if (!vertShader || !fragShader) return null;

      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vertShader);
      gl.attachShader(program, fragShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
      }
      return program;
    };

    const program = createProgram(vertexShader, fragmentShader);
    if (!program) return;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");

    const startTime = Date.now();

    const render = () => {
      const currentTime = (Date.now() - startTime) / 1000;

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(timeLocation, currentTime);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
