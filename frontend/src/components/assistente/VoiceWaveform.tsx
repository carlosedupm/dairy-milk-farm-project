"use client";

import { useEffect, useRef } from "react";

interface VoiceWaveformProps {
  isActive: boolean;
  color?: string;
}

export function VoiceWaveform({ isActive, color = "hsl(var(--primary))" }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(undefined);

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let startTime = Date.now();

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const time = (Date.now() - startTime) / 1000;

      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";

      const bars = 20;
      const barWidth = width / bars;
      
      for (let i = 0; i < bars; i++) {
        // Simular movimento de onda senoidal com ruído aleatório
        const x = i * barWidth + barWidth / 2;
        const baseHeight = Math.sin(time * 5 + i * 0.5) * 0.5 + 0.5;
        const randomNoise = Math.random() * 0.3;
        const amplitude = (baseHeight + randomNoise) * (height * 0.6);
        
        ctx.moveTo(x, height / 2 - amplitude / 2);
        ctx.lineTo(x, height / 2 + amplitude / 2);
      }

      ctx.stroke();
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={120} 
      height={32} 
      className={`transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-0"}`}
    />
  );
}
