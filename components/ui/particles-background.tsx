"use client";

import React, { useEffect, useState, useCallback } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import type { Container, Engine } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";

interface ParticlesBackgroundProps {
  className?: string;
  particleDensity?: number;
  minSize?: number;
  maxSize?: number;
  speed?: number;
}

export const ParticlesBackground: React.FC<ParticlesBackgroundProps> = ({
  className = "",
  particleDensity = 60,
  minSize = 3,
  maxSize = 6,
  speed = 1,
}) => {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine: Engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = useCallback(async (container?: Container) => {
    // Particles loaded
  }, []);

  if (!init) {
    return null;
  }

  return (
    <div className={`fixed inset-0 pointer-events-none ${className}`} style={{ zIndex: 0 }}>
      <Particles
        id="tsparticles-bg"
        className="h-full w-full"
        particlesLoaded={particlesLoaded}
        options={{
          background: {
            color: {
              value: "transparent",
            },
          },
          fullScreen: {
            enable: false,
            zIndex: 0,
          },
          fpsLimit: 30,
          interactivity: {
            events: {
              onClick: {
                enable: false,
              },
              onHover: {
                enable: false,
              },
            },
          },
          particles: {
            color: {
              value: ["#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#06b6d4"],
            },
            links: {
              color: "#6366f1",
              distance: 150,
              enable: true,
              opacity: 0.3,
              width: 1,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: {
                default: "bounce",
              },
              random: false,
              speed: speed,
              straight: false,
            },
            number: {
              density: {
                enable: true,
              },
              value: particleDensity,
            },
            opacity: {
              value: 0.6,
            },
            shape: {
              type: "circle",
            },
            size: {
              value: {
                min: minSize,
                max: maxSize,
              },
            },
          },
          detectRetina: true,
        }}
      />
    </div>
  );
};
